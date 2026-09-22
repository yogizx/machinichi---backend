import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { User } from '../models/User';
import { generateAuthTokens } from '../services/token.service';
import { sendGoogleWelcomeEmail } from '../services/email.service';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const setRefreshCookie = (res: Response, token: string) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

export const googleAuth = async (req: Request, res: Response): Promise<any> => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ message: 'Google ID token is required' });
    }

    let payload: any;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (verifyErr) {
      return res.status(401).json({ message: 'Invalid Google ID token' });
    }

    if (!payload || !payload.email) {
      return res.status(400).json({ message: 'Google account must have an email address' });
    }

    const { sub: googleId, email, name, picture } = payload;

    let user = await User.findOne({
      $or: [{ googleId }, { email: email.toLowerCase() }],
    });

    const isNewUser = !user;

    if (!user) {
      user = await User.create({
        fullName: name || email.split('@')[0],
        email: email.toLowerCase(),
        avatar: picture || undefined,
        provider: 'google',
        googleId,
        role: 'customer',
        isEmailVerified: true,
      });

      try {
        await sendGoogleWelcomeEmail(email, name || email.split('@')[0]);
      } catch (emailErr) {
        console.error('Failed to send welcome email:', emailErr);
      }
    } else {
      if (!user.googleId) {
        user.googleId = googleId;
        user.provider = 'google';
      }
      if (!user.avatar && picture) {
        user.avatar = picture;
      }
    }

    user.lastLogin = new Date();
    user.lastLoginIp = req.ip || '';
    user.lastLoginDevice = req.headers['user-agent'] || '';
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    const { accessToken, refreshToken } = await generateAuthTokens(
      user._id as any,
      req.ip,
      req.headers['user-agent']
    );
    setRefreshCookie(res, refreshToken);

    return res.status(200).json({
      message: isNewUser ? 'Account created with Google' : 'Signed in with Google',
      accessToken,
      isNewUser,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
      },
    });
  } catch (err: any) {
    console.error('Google auth error:', err);
    return res.status(500).json({ message: 'Google authentication failed', error: err.message });
  }
};

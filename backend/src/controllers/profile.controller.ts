import { Request, Response } from 'express';
import crypto from 'crypto';
import { User } from '../models/User';
import { OTP } from '../models/OTP';
import { Address } from '../models/Address';
import { Cart } from '../models/Cart';
import { Wishlist } from '../models/Wishlist';
import { SavedForLater } from '../models/SavedForLater';
import { RefreshToken } from '../models/RefreshToken';
import { LoginAudit } from '../models/LoginAudit';
import { ReturnRequest } from '../models/ReturnRequest';
import { Notification } from '../models/Notification';
import { Review } from '../models/Review';
import { Business } from '../models/Business';
import { View } from '../models/View';
import { ProductViewEvent } from '../models/ProductViewEvent';
import { AuthRequest } from '../middlewares/auth.middleware';
import { sendEmailVerificationEmail } from '../services/email.service';

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

export const getProfile = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const user = await User.findById(req.user?.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.status(200).json({
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role,
        provider: user.provider,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
        lastLogin: user.lastLogin,
        createdAt: (user as any).createdAt,
        gstCertificate: user.gstCertificate,
        fssaiCertificate: user.fssaiCertificate,
        compliance: (user as any).compliance,
        twoStep: user.twoStep,
        storeInfo: user.storeInfo,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to fetch profile', error: err.message });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { fullName, phone, gstCertificate, fssaiCertificate, twoStep, storeInfo, compliance } = req.body;
    const user = await User.findById(req.user?.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (fullName) {
      const clean = fullName.trim().replace(/\s+/g, ' ');
      if (clean.length < 3 || clean.length > 50 || !/^[A-Za-z\s]+$/.test(clean)) {
        return res.status(400).json({ message: 'Invalid full name' });
      }
      user.fullName = clean;
    }
    if (phone) {
      if (user.isPhoneVerified && user.phone !== phone) {
        return res.status(400).json({ message: 'Phone number is verified and cannot be changed.' });
      }
      user.phone = phone;
    }

    if (gstCertificate !== undefined) {
      if (gstCertificate !== null) {
        const { name, size, url, uploadedAt } = gstCertificate;
        if (!name || !size || !url) {
          return res.status(400).json({ message: 'Invalid GST certificate details' });
        }
        if (size > 2 * 1024 * 1024) {
          return res.status(400).json({ message: 'GST certificate exceeds 2 MB size limit' });
        }
        user.gstCertificate = { name, size, url, uploadedAt: uploadedAt ? new Date(uploadedAt) : new Date() };
      } else {
        user.gstCertificate = undefined;
      }
    }

    if (fssaiCertificate !== undefined) {
      if (fssaiCertificate !== null) {
        const { name, size, url, uploadedAt } = fssaiCertificate;
        if (!name || !size || !url) {
          return res.status(400).json({ message: 'Invalid FSSAI certificate details' });
        }
        if (size > 2 * 1024 * 1024) {
          return res.status(400).json({ message: 'FSSAI certificate exceeds 2 MB size limit' });
        }
        user.fssaiCertificate = { name, size, url, uploadedAt: uploadedAt ? new Date(uploadedAt) : new Date() };
      } else {
        user.fssaiCertificate = undefined;
      }
    }

    if (twoStep !== undefined) {
      const email = twoStep.email?.trim();
      if (email) {
        // Validate valid email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return res.status(400).json({ message: 'Invalid 2-step verification email format' });
        }

        // Use the authenticated User's login email
        const adminEmail = (user.email || '').trim().toLowerCase();
        if (email.toLowerCase() === adminEmail) {
          return res.status(400).json({ message: 'Verification email must be different from Admin login email' });
        }
      }
      
      user.twoStep = {
        enabled: twoStep.enabled !== undefined ? !!twoStep.enabled : (user.twoStep?.enabled || false),
        email: email ? email.toLowerCase() : (user.twoStep?.email || ''),
      };
    }

    if (storeInfo !== undefined) {
      const { brandName, location, city, state, storeEmail } = storeInfo;
      
      const trimmedStoreEmail = storeEmail?.trim();
      if (trimmedStoreEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedStoreEmail)) {
          return res.status(400).json({ message: 'Invalid store email address format' });
        }
      }

      user.storeInfo = {
        brandName: brandName !== undefined ? brandName.trim() : (user.storeInfo?.brandName || ''),
        location: location !== undefined ? location.trim() : (user.storeInfo?.location || ''),
        city: city !== undefined ? city.trim() : (user.storeInfo?.city || ''),
        state: state !== undefined ? state.trim() : (user.storeInfo?.state || ''),
        storeEmail: trimmedStoreEmail ? trimmedStoreEmail.toLowerCase() : (user.storeInfo?.storeEmail || ''),
      };
    }

    if (compliance !== undefined) {
      const complianceData: any = compliance || {};
      // Validate productCertifications entries
      if (Array.isArray(complianceData.productCertifications)) {
        complianceData.productCertifications = complianceData.productCertifications
          .filter((c: any) => c && c.name && c.url)
          .map((c: any) => ({
            name: String(c.name).trim(),
            url: String(c.url),
            size: Number(c.size) || 0,
            uploadedAt: c.uploadedAt ? new Date(c.uploadedAt) : new Date(),
          }));
      }
      (user as any).compliance = complianceData;
    }

    await user.save();
    return res.status(200).json({ message: 'Profile updated', user });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to update profile', error: err.message });
  }
};

export const updatePassword = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    const pwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s])\S{8,}$/;
    if (!pwdRegex.test(newPassword)) {
      return res.status(400).json({
        message: 'Password must be 8+ characters with uppercase, lowercase, number, and special character',
      });
    }

    const user = await User.findById(req.user?.userId).select('+password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.provider !== 'local') {
      return res.status(400).json({ message: 'Cannot update password for social login accounts' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });

    user.password = newPassword;
    await user.save();

    return res.status(200).json({ message: 'Password updated successfully' });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to update password', error: err.message });
  }
};

export const getAddresses = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const addresses = await Address.find({ user: req.user?.userId }).sort({ isDefault: -1, createdAt: -1 });
    return res.status(200).json({ addresses });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to fetch addresses', error: err.message });
  }
};

export const getDefaultAddress = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const address = await Address.findOne({ user: req.user?.userId, isDefault: true });
    return res.status(200).json({ address });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to fetch default address', error: err.message });
  }
};

export const createAddress = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const {
      fullName,
      mobileNumber,
      country,
      state,
      city,
      pincode,
      streetArea,
      houseFlat,
      landmark,
      deliveryInstructions,
      isDefault
    } = req.body;

    if (!fullName || !mobileNumber || !country || !state || !city || !pincode || !streetArea || !houseFlat) {
      return res.status(400).json({ message: 'All required address fields must be filled' });
    }

    if (isDefault) {
      await Address.updateMany({ user: req.user?.userId }, { isDefault: false });
    }

    const streetAddress = [houseFlat.trim(), streetArea.trim(), landmark?.trim()].filter(Boolean).join(', ');

    const address = await Address.create({
      user: req.user?.userId,
      fullName: fullName.trim(),
      mobileNumber: mobileNumber.trim(),
      phoneNumber: mobileNumber.trim(), // backward compatibility
      country: country.trim(),
      state: state.trim(),
      city: city.trim(),
      pincode: pincode.trim(),
      zipCode: pincode.trim(), // backward compatibility
      streetArea: streetArea.trim(),
      houseFlat: houseFlat.trim(),
      streetAddress, // backward compatibility
      landmark: landmark ? landmark.trim() : undefined,
      deliveryInstructions: deliveryInstructions ? deliveryInstructions.trim() : undefined,
      isDefault: !!isDefault,
      label: 'Home'
    });

    return res.status(201).json({ message: 'Address created', address });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to create address', error: err.message });
  }
};

export const updateAddress = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const {
      fullName,
      mobileNumber,
      country,
      state,
      city,
      pincode,
      streetArea,
      houseFlat,
      landmark,
      deliveryInstructions,
      isDefault
    } = req.body;

    const address = await Address.findOne({ _id: id, user: req.user?.userId });
    if (!address) return res.status(404).json({ message: 'Address not found' });

    if (fullName !== undefined) address.fullName = fullName.trim();
    if (mobileNumber !== undefined) {
      address.mobileNumber = mobileNumber.trim();
      address.phoneNumber = mobileNumber.trim();
    }
    if (country !== undefined) address.country = country.trim();
    if (state !== undefined) address.state = state.trim();
    if (city !== undefined) address.city = city.trim();
    if (pincode !== undefined) {
      address.pincode = pincode.trim();
      address.zipCode = pincode.trim();
    }
    if (streetArea !== undefined) address.streetArea = streetArea.trim();
    if (houseFlat !== undefined) address.houseFlat = houseFlat.trim();
    if (landmark !== undefined) address.landmark = landmark ? landmark.trim() : undefined;
    if (deliveryInstructions !== undefined) address.deliveryInstructions = deliveryInstructions ? deliveryInstructions.trim() : undefined;

    // Recalculate streetAddress for backward compatibility
    const currentHouseFlat = houseFlat !== undefined ? houseFlat.trim() : (address.houseFlat || '');
    const currentStreetArea = streetArea !== undefined ? streetArea.trim() : (address.streetArea || '');
    const currentLandmark = landmark !== undefined ? (landmark ? landmark.trim() : '') : (address.landmark || '');
    address.streetAddress = [currentHouseFlat, currentStreetArea, currentLandmark].filter(Boolean).join(', ');

    if (isDefault) {
      await Address.updateMany({ user: req.user?.userId, _id: { $ne: id } }, { isDefault: false });
      address.isDefault = true;
    } else if (isDefault === false) {
      address.isDefault = false;
    }

    await address.save();
    return res.status(200).json({ message: 'Address updated', address });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to update address', error: err.message });
  }
};

export const deleteAddress = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const address = await Address.findOneAndDelete({ _id: id, user: req.user?.userId });
    if (!address) return res.status(404).json({ message: 'Address not found' });
    return res.status(200).json({ message: 'Address deleted' });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to delete address', error: err.message });
  }
};

export const sendVerificationOTP = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { type } = req.body;
    if (!type || !['email', 'phone'].includes(type)) {
      return res.status(400).json({ message: 'Invalid verification type. Use "email" or "phone".' });
    }

    const user = await User.findById(req.user?.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const identifier = type === 'email' ? user.email : user.phone;
    if (!identifier) return res.status(400).json({ message: `No ${type} on file to verify` });

    if (type === 'email' && user.isEmailVerified) {
      return res.status(400).json({ message: 'Email already verified' });
    }
    if (type === 'phone' && user.isPhoneVerified) {
      return res.status(400).json({ message: 'Phone already verified' });
    }

    const otpType = type === 'email' ? 'email_verify' : 'phone_verify';

    const existing = await OTP.findOne({ identifier, type: otpType });
    if (existing?.lockedUntil && existing.lockedUntil > new Date()) {
      const remaining = Math.ceil((existing.lockedUntil.getTime() - Date.now()) / 60000);
      return res.status(429).json({ message: `OTP locked. Try again in ${remaining} minutes.` });
    }

    if (existing) {
      const cooldown = (Date.now() - (existing as any).createdAt.getTime()) / 1000;
      if (cooldown < 60) {
        return res.status(429).json({ message: `Wait ${Math.ceil(60 - cooldown)}s before requesting a new OTP.` });
      }
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await OTP.deleteMany({ identifier, type: otpType });
    await OTP.create({
      identifier,
      otp,
      type: otpType,
      expiresAt,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    if (type === 'email') {
      try {
        await sendEmailVerificationEmail(identifier, otp, user.fullName);
      } catch (emailErr: any) {
        console.error('Failed to send verification email:', emailErr.message);
        return res.status(200).json({ message: 'OTP generated but email delivery failed. Contact support.' });
      }
    } else {
      try {
        const twilio = require('twilio');
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        await client.messages.create({
          from: process.env.TWILIO_WHATSAPP_FROM,
          to: `whatsapp:${identifier}`,
          body: `Your Machinichi verification code is: *${otp}*\n\nThis OTP expires in 10 minutes. Do not share it with anyone.`,
        });
      } catch (twilioErr: any) {
        console.error('Failed to send SMS OTP:', twilioErr.message);
      }
    }

    return res.status(200).json({ message: `Verification OTP sent to your ${type}.` });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to send verification OTP', error: err.message });
  }
};

export const verifyOTP = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { type, otp } = req.body;
    if (!type || !['email', 'phone'].includes(type)) {
      return res.status(400).json({ message: 'Invalid verification type.' });
    }
    if (!otp || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: 'Invalid OTP format. Must be 6 digits.' });
    }

    const user = await User.findById(req.user?.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const identifier = type === 'email' ? user.email : user.phone;
    if (!identifier) return res.status(400).json({ message: `No ${type} on file.` });

    const otpType = type === 'email' ? 'email_verify' : 'phone_verify';
    const record = await OTP.findOne({ identifier, type: otpType });

    if (!record) return res.status(400).json({ message: 'OTP not found. Request a new one.' });

    if (record.lockedUntil && record.lockedUntil > new Date()) {
      const remaining = Math.ceil((record.lockedUntil.getTime() - Date.now()) / 60000);
      return res.status(429).json({ message: `Too many failed attempts. Locked for ${remaining} minutes.` });
    }

    if (record.expiresAt < new Date()) return res.status(400).json({ message: 'OTP expired. Request a new one.' });

    if (record.otp !== otp) {
      record.attempts += 1;
      if (record.attempts >= 5) {
        record.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      await record.save();
      const remaining = 5 - record.attempts;
      if (remaining <= 0) {
        return res.status(429).json({ message: 'Too many failed attempts. OTP locked for 15 minutes.' });
      }
      return res.status(400).json({ message: `Invalid OTP. ${remaining} attempt(s) remaining.` });
    }

    if (type === 'email') {
      user.isEmailVerified = true;
    } else {
      user.isPhoneVerified = true;
    }
    await user.save();

    await OTP.deleteOne({ _id: record._id });

    return res.status(200).json({
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} verified successfully`,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role,
        provider: user.provider,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ message: 'OTP verification failed', error: err.message });
  }
};

export const deleteAccount = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Clean up all related documents cascadingly
    const userIdentifiers = [user.email, user.phone].filter(Boolean) as string[];

    await Promise.all([
      Address.deleteMany({ user: userId }),
      Cart.deleteMany({ userId }),
      Wishlist.deleteMany({ userId }),
      SavedForLater.deleteMany({ userId }),
      RefreshToken.deleteMany({ user: userId }),
      LoginAudit.deleteMany({ userId }),
      ReturnRequest.deleteMany({ userId }),
      Notification.deleteMany({ userId }),
      Review.deleteMany({ userId }),
      Business.deleteMany({ submittedBy: userId }),
      View.deleteMany({ userId }),
      ProductViewEvent.deleteMany({ userId }),
      OTP.deleteMany({ identifier: { $in: userIdentifiers } }),
      User.findByIdAndDelete(userId),
    ]);

    // Clear session cookies
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    return res.status(200).json({ success: true, message: 'Account permanently deleted' });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to delete account', error: err.message });
  }
};


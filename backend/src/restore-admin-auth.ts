import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { User } from './models/User';

async function restoreAdminAuth() {
  const uri = process.env.MONGODB_URI!;
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(uri, { family: 4 } as any);

  const adminEmail = 'admin@machinichi.com';
  const plainPassword = 'AdminPassword123!';
  const hashedPassword = await bcrypt.hash(plainPassword, 12);

  console.log(`Updating auth state for ${adminEmail}...`);
  const result = await User.updateOne(
    { email: adminEmail, role: { $in: ['admin', 'super_admin'] } },
    {
      $set: {
        password: hashedPassword,
        failedLoginAttempts: 0,
        isActive: true,
        isDeleted: false,
        isBlocked: false,
      },
      $unset: {
        lockUntil: 1,
        passwordResetToken: 1,
        passwordResetExpires: 1,
        passwordResetLockUntil: 1,
      },
    }
  );

  console.log('Update result:', result);

  const updatedUser = await User.findOne({ email: adminEmail }).select('+password');
  if (updatedUser) {
    console.log(`User verification:`);
    console.log(`  Email: ${updatedUser.email}`);
    console.log(`  Role: ${updatedUser.role}`);
    console.log(`  isActive: ${updatedUser.isActive}`);
    console.log(`  isDeleted: ${updatedUser.isDeleted}`);
    console.log(`  failedLoginAttempts: ${updatedUser.failedLoginAttempts}`);
    console.log(`  isLocked: ${updatedUser.isLocked}`);

    const isMatch = await bcrypt.compare(plainPassword, updatedUser.password || '');
    console.log(`  Bcrypt verify test: ${isMatch ? 'PASSED' : 'FAILED'}`);
  }

  await mongoose.disconnect();
}

restoreAdminAuth();

// src/scripts/seed-admin-users.ts
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { AdminUser } from '../admin/models/AdminUser.model';
import { env } from '../core/config/env';
import logger from '../core/utils/logger';

const users = [
  {
    email: 'superadmin@sagenex.com',
    password: 'DefaultPassword_SuperAdmin',
    role: 'SUPERADMIN',
  },
  {
    email: 'finance@sagenex.com',
    password: 'DefaultPassword_Finance',
    role: 'FINANCE',
  },
  {
    email: 'support@sagenex.com',
    password: 'DefaultPassword_Support',
    role: 'SUPPORT',
  },
  {
    email: 'auditor@sagenex.com',
    password: 'DefaultPassword_Auditor',
    role: 'AUDITOR',
  },
  {
    email: 'kycadmin@sagenex.com',
    password: 'DefaultPassword_KycAdmin',
    role: 'KYC_ADMIN',
  },
];

const seedAdminUsers = async () => {
  try {
    await mongoose.connect(env.MONGODB_URI);
    logger.info('MongoDB connected for seeding admin users.');

    for (const user of users) {
      const existingUser = await AdminUser.findOne({ email: user.email });
      if (existingUser) {
        logger.info(`Admin user with email ${user.email} already exists. Skipping.`);
        continue;
      }

      const passwordHash = await bcrypt.hash(user.password, 10);
      await AdminUser.create({
        email: user.email,
        passwordHash,
        role: user.role,
      });
      logger.info(`Created admin user: ${user.email} with role ${user.role}`);
    }
  } catch (error) {
    logger.error('Error seeding admin users:', error);
  } finally {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected.');
  }
};

seedAdminUsers();

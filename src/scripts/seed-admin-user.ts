import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { AdminUser } from 'admin/models/AdminUser.model';
import { env } from 'core/config/env';

const ADMIN_EMAIL = 'admin@sgchain.com';
const ADMIN_PASSWORD = 'Password123!';

const updateAdminPassword = async () => {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const admin = await AdminUser.findOne({ email: ADMIN_EMAIL });

    if (admin) {
      admin.passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
      await admin.save();
      console.log('Admin password updated successfully.');
      console.log(`Email: ${ADMIN_EMAIL}`);
      console.log(`New Password: ${ADMIN_PASSWORD}`);
    } else {
      console.log('Admin user not found. Creating a new one.');
      const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
      await AdminUser.create({
        email: ADMIN_EMAIL,
        passwordHash,
        role: 'SUPERADMIN',
      });
      console.log('Default admin user created successfully.');
      console.log(`Email: ${ADMIN_EMAIL}`);
      console.log(`Password: ${ADMIN_PASSWORD}`);
    }
  } catch (error) {
    console.error('Error updating admin password:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

updateAdminPassword();

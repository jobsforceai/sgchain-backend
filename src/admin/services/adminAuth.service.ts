import { AdminUser } from 'admin/models/AdminUser.model';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from 'core/config/env';

export const login = async (email: string, password: string) => {
  const admin = await AdminUser.findOne({ email });
  if (!admin) {
    throw new Error('Invalid email or password');
  }

  const isPasswordValid = await bcrypt.compare(password, admin.passwordHash);
  if (!isPasswordValid) {
    throw new Error('Invalid email or password');
  }

  const token = jwt.sign(
    { adminId: admin._id, role: admin.role },
    env.JWT_SECRET_ADMIN,
    { expiresIn: '1h' }
  );

  return { token, admin };
};

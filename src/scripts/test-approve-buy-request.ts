// src/scripts/test-approve-buy-request.ts
import mongoose from 'mongoose';
import axios from 'axios';
import { env } from '../core/config/env';
import { FiatDepositRequest } from '../user/models/FiatDepositRequest.model';
import logger from '../core/utils/logger';

const ADMIN_EMAIL = 'admin@sgchain.com';
const ADMIN_PASSWORD = 'Password123!';
const API_BASE_URL = `http://localhost:${env.PORT}`;

const run = async () => {
  try {
    // 1. Log in as admin
    logger.info(`Logging in as admin: ${ADMIN_EMAIL}...`);
    const loginRes = await axios.post(`${API_BASE_URL}/admin/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    const adminToken = loginRes.data.token;
    logger.info('Admin login successful.');

    // 2. Find the latest pending request
    await mongoose.connect(env.MONGODB_URI);
    logger.info('Connected to DB to find pending request...');
    const pendingRequest = await FiatDepositRequest.findOne({ status: 'PENDING' }).sort({ createdAt: -1 });

    if (!pendingRequest) {
      logger.warn('No pending buy requests found to approve.');
      return;
    }
    logger.info(`Found pending request with ID: ${pendingRequest._id}`);

    // 3. Call the approve endpoint
    logger.info(`Calling approve endpoint for request ${pendingRequest._id}...`);
    const approveRes = await axios.post(
      `${API_BASE_URL}/admin/buy-sgc/requests/${pendingRequest._id}/approve`,
      { adminComment: 'Approved via test script' },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    logger.info('✅ Approval successful! API Response:');
    console.log(approveRes.data);

  } catch (error: any) {
    logger.error('❌ Script failed:');
    if (error.response) {
      console.error('API Error:', error.response.data);
    } else {
      console.error(error.message);
    }
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

run();

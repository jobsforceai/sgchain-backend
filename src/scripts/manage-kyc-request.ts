// src/scripts/manage-kyc-request.ts
import mongoose from 'mongoose';
import { env } from '../core/config/env';
import { User } from '../user/models/User.model';
import { KycRecord, IKycRecord } from '../user/models/KycRecord.model';
import * as kycAdminService from '../admin/services/kycAdmin.service';
import logger from '../core/utils/logger';

const run = async () => {
  try {
    const userEmail = process.argv[2];
    const action = process.argv[3]; // 'approve' or 'reject'
    const reason = process.argv[4] || 'Processed via admin script'; // Optional reason

    if (!userEmail || !action || !['approve', 'reject'].includes(action)) {
      logger.error('Invalid arguments.');
      logger.info('Usage: npm run manage:kyc <user-email> <approve|reject> [reason]');
      process.exit(1);
    }

    await mongoose.connect(env.MONGODB_URI);
    logger.info(`Connecting to DB...`);

    const user = await User.findOne({ email: userEmail });
    if (!user) {
      throw new Error(`User with email ${userEmail} not found.`);
    }

    const pendingRequest = await KycRecord.findOne({ userId: user._id, status: 'PENDING' });
    if (!pendingRequest) {
      throw new Error(`No pending KYC request found for user ${userEmail}.`);
    }

    // Force type assertion to bypass incorrect type inference
    const requestId = (pendingRequest as any)._id.toString();

    logger.info(`Found pending KYC request ${requestId} for user ${userEmail}.`);
    logger.info(`Action: ${action.toUpperCase()}`);

    if (action === 'approve') {
      await kycAdminService.approveKycRequest(requestId, reason);
      logger.info(`✅ Successfully APPROVED KYC request.`);
    } else if (action === 'reject') {
      await kycAdminService.rejectKycRequest(requestId, reason, reason);
      logger.info(`✅ Successfully REJECTED KYC request.`);
    }

  } catch (error: any) {
    logger.error('❌ Script failed:');
    console.error(error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

run();

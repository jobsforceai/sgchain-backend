// src/admin/services/kycAdmin.service.ts
import { KycRecord } from 'user/models/KycRecord.model';
import { KycDocument } from 'user/models/KycDocument.model';
import { User } from 'user/models/User.model';
import logger from 'core/utils/logger';

export const getKycRequests = async (status: string = 'PENDING') => {
  return KycRecord.find({ status }).sort({ submittedAt: -1 });
};

export const getKycRequestDetails = async (requestId: string) => {
  const application = await KycRecord.findById(requestId).lean();
  if (!application) throw new Error('KYC_REQUEST_NOT_FOUND');

  const documents = await KycDocument.find({ userId: application.userId, region: application.region }).lean();
  const user = await User.findById(application.userId).select('email fullName').lean();

  return { application, documents, user };
};

export const approveKycRequest = async (requestId: string, adminNotes: string) => {
  const request = await KycRecord.findById(requestId);
  if (!request || request.status !== 'PENDING') {
    throw new Error('INVALID_KYC_REQUEST');
  }

  request.status = 'VERIFIED';
  request.adminNotes = adminNotes;
  await request.save();

  // Add the verified region to the user's main record for quick checks
  await User.findByIdAndUpdate(request.userId, {
    $addToSet: { kycVerifiedRegions: request.region }
  });

  logger.info(`KYC request ${requestId} for user ${request.userId} has been APPROVED.`);
  return { status: 'SUCCESS', requestId };
};

export const rejectKycRequest = async (requestId: string, rejectionReason: string, adminNotes: string) => {
  const request = await KycRecord.findById(requestId);
  if (!request || request.status !== 'PENDING') {
    throw new Error('INVALID_KYC_REQUEST');
  }

  request.status = 'REJECTED';
  request.rejectionReason = rejectionReason;
  request.adminNotes = adminNotes;
  await request.save();

  // Optional: Remove the region from the user's verified list if it was there before
  await User.findByIdAndUpdate(request.userId, {
    $pull: { kycVerifiedRegions: request.region }
  });

  logger.info(`KYC request ${requestId} for user ${request.userId} has been REJECTED.`);
  return { status: 'SUCCESS', requestId };
};

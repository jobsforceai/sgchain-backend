// src/user/services/kyc.service.ts
import { KycRecord } from 'user/models/KycRecord.model';
import { KycDocument, IKycDocument } from 'user/models/KycDocument.model';
import logger from 'core/utils/logger';

// This function creates or updates a single document. It's idempotent.
export const uploadKycDocument = async (userId: string, data: any) => {
  const { region, documentType, documentUrl, documentBackUrl } = data;

  // 1. Ensure a DRAFT application exists for this user and region
  await KycRecord.findOneAndUpdate(
    { userId, region },
    { $setOnInsert: { userId, region, status: 'DRAFT' } },
    { upsert: true, new: true }
  );

  // 2. Create or update the specific document
  const document = await KycDocument.findOneAndUpdate(
    { userId, region, documentType },
    { userId, region, documentType, documentUrl, documentBackUrl },
    { upsert: true, new: true }
  );

  logger.info(`User ${userId} uploaded document ${documentType} for region ${region}.`);
  return { documentId: document._id, documentType: document.documentType };
};

// This function moves the application from DRAFT to PENDING
export const submitKycApplication = async (userId: string, region: 'INDIA' | 'DUBAI') => {
  const application = await KycRecord.findOne({ userId, region });

  if (!application || application.status !== 'DRAFT') {
    throw new Error('NO_DRAFT_APPLICATION_FOUND');
  }

  // Business Logic: Check if minimum required documents are uploaded
  const requiredDocs: IKycDocument['documentType'][] = ['NATIONAL_ID', 'SELFIE']; // Example for INDIA
  const userDocs = await KycDocument.find({ userId, region });
  const userDocTypes = userDocs.map(d => d.documentType);

  for (const docType of requiredDocs) {
    if (!userDocTypes.includes(docType)) {
      throw new Error(`MISSING_REQUIRED_DOCUMENT: ${docType}`);
    }
  }

  application.status = 'PENDING';
  application.submittedAt = new Date();
  await application.save();

  logger.info(`User ${userId} submitted KYC application for region ${region}.`);
  return { kycId: application._id, status: application.status };
};

// This function shows the user their overall status and what they've uploaded
export const getKycStatus = async (userId: string) => {
  const applications = await KycRecord.find({ userId }).lean();
  const documents = await KycDocument.find({ userId }).lean();

  return applications.map(app => ({
    ...app,
    documents: documents.filter(doc => doc.region === app.region),
  }));
};
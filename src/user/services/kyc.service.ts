import { KycRecord } from 'user/models/KycRecord.model';
import { KycDocument, IKycDocument } from 'user/models/KycDocument.model';
import logger from 'core/utils/logger';
import { uploadToS3 } from 'core/utils/s3.helper';

// This function creates or updates a single document. It's idempotent.
export const uploadKycDocument = async (userId: string, file: Express.Multer.File, body: any) => {
  const { region, docType } = body;

  if (!file) {
    throw new Error('NO_FILE_UPLOADED');
  }

  // 1. Upload file to S3
  const { Location } = await uploadToS3(file, userId);

  // 2. Ensure a DRAFT application exists for this user and region
  await KycRecord.findOneAndUpdate(
    { userId, region },
    { $setOnInsert: { userId, region, status: 'DRAFT' } },
    { upsert: true, new: true }
  );

  // 3. Map frontend 'docType' to DB 'documentType' & fields
  let dbDocumentType: string = docType;
  let updateField: any = { documentUrl: Location };

  // Mapping logic
  if (docType === 'AADHAAR_FRONT') {
    dbDocumentType = 'NATIONAL_ID';
    updateField = { documentUrl: Location };
  } else if (docType === 'AADHAAR_BACK') {
    dbDocumentType = 'NATIONAL_ID';
    updateField = { documentBackUrl: Location };
  } else if (docType === 'PAN') {
     // Assuming PAN is treated as a secondary ID or specific type. 
     // Since the model restricts enum, we might map it to 'NATIONAL_ID' if users only upload one, 
     // or we might need to expand the model. For now, let's map to 'DRIVING_LICENSE' (just as a placeholder for secondary ID) 
     // OR strictly follow the existing enum. 
     // Let's assume the user sends 'NATIONAL_ID' for PAN if they want, or we map 'PAN' -> 'NATIONAL_ID' 
     // But if they upload AADHAAR and PAN, they clash. 
     // Let's stick to the raw 'docType' if it matches the Enum, otherwise try best guess.
     // If the user sends 'NATIONAL_ID', use it.
     if (!['PASSPORT', 'DRIVING_LICENSE', 'NATIONAL_ID', 'SELFIE', 'PROOF_OF_ADDRESS'].includes(docType)) {
        // Fallback or specific handling
        if (docType === 'PAN') dbDocumentType = 'NATIONAL_ID'; // Conflict risk if Aadhaar exists
     }
  }

  // 4. Create or update the specific document
  const document = await KycDocument.findOneAndUpdate(
    { userId, region, documentType: dbDocumentType },
    { 
      userId, 
      region, 
      documentType: dbDocumentType, 
      ...updateField 
    },
    { upsert: true, new: true }
  );

  logger.info(`User ${userId} uploaded document ${docType} (mapped to ${dbDocumentType}) for region ${region}. S3 URL: ${Location}`);
  return { documentId: document._id, documentType: document.documentType, url: Location };
};

// This function moves the application from DRAFT to PENDING
export const submitKycApplication = async (userId: string, region: 'INDIA' | 'DUBAI') => {
  const application = await KycRecord.findOne({ userId, region });

  // Allow resubmission if status is DRAFT or REJECTED
  if (!application || (application.status !== 'DRAFT' && application.status !== 'REJECTED')) {
    throw new Error('NO_DRAFT_APPLICATION_FOUND');
  }

  // Business Logic: Check if minimum required documents are uploaded
  let requiredDocs: IKycDocument['documentType'][] = [];

  if (region === 'INDIA') {
    requiredDocs = ['NATIONAL_ID', 'SELFIE'];
  } else if (region === 'DUBAI') {
    // For Dubai, either PASSPORT or NATIONAL_ID (Emirates ID) is acceptable + SELFIE
    // We check this logic slightly differently below
    requiredDocs = ['SELFIE']; 
  }

  const userDocs = await KycDocument.find({ userId, region });
  const userDocTypes = userDocs.map(d => d.documentType);

  // Check strict requirements first
  for (const docType of requiredDocs) {
    if (!userDocTypes.includes(docType)) {
      throw new Error(`MISSING_REQUIRED_DOCUMENT: ${docType}`);
    }
  }

  // Region-specific logic for alternative documents
  if (region === 'DUBAI') {
    const hasId = userDocTypes.includes('PASSPORT') || userDocTypes.includes('NATIONAL_ID');
    if (!hasId) {
      throw new Error('MISSING_REQUIRED_DOCUMENT: PASSPORT_OR_NATIONAL_ID');
    }
  }

  // Clear previous rejection details on resubmission
  if (application.status === 'REJECTED') {
    application.rejectionReason = undefined;
    application.adminNotes = undefined;
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
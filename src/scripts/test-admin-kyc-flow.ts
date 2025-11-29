import mongoose from 'mongoose';
import { env } from '../core/config/env';
import { AdminUser } from '../admin/models/AdminUser.model';
import { User } from '../user/models/User.model';
import { KycRecord } from '../user/models/KycRecord.model';
import { KycDocument } from '../user/models/KycDocument.model';
import * as kycAdminService from '../admin/services/kycAdmin.service';

const TEST_USER_EMAIL = 'test.kyc.user@example.com';
const TEST_ADMIN_EMAIL = 'admin@sgchain.com'; // Assuming default admin

const runKycAdminTest = async () => {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(env.MONGODB_URI);
  console.log('Connected.');

  try {
    // Clean up previous test data if any
    await User.deleteOne({ email: TEST_USER_EMAIL });

    // 1. Create a test user
    const user = await User.create({
      email: TEST_USER_EMAIL,
      password: 'testpassword123', // Provide a plain password, it will be hashed by the pre-save hook
      fullName: 'Test KYC User',
      onchainAddress: '0xTestAddress'
    });
    console.log(`Created test user: ${user.email} (ID: ${user._id})`);

    // 2. Simulate document upload (we'll create direct DB entries for simplicity)
    const dummyDocumentUrl = 'https://s3.amazonaws.com/test-bucket/kyc/test-user/mock-aadhaar-front.jpg';
    const dummyDocumentBackUrl = 'https://s3.amazonaws.com/test-bucket/kyc/test-user/mock-aadhaar-back.jpg';
    const dummySelfieUrl = 'https://s3.amazonaws.com/test-bucket/kyc/test-user/mock-selfie.jpg';

    await KycDocument.create({
      userId: user._id,
      region: 'INDIA',
      documentType: 'NATIONAL_ID',
      documentUrl: dummyDocumentUrl,
      documentBackUrl: dummyDocumentBackUrl,
    });
    await KycDocument.create({
      userId: user._id,
      region: 'INDIA',
      documentType: 'SELFIE',
      documentUrl: dummySelfieUrl,
    });
    console.log('Simulated document uploads for test user.');

    // 3. Simulate KYC application submission (move to PENDING)
    const kycRecord = await KycRecord.create({
      userId: user._id,
      region: 'INDIA',
      status: 'PENDING',
      submittedAt: new Date(),
    });
    console.log(`Simulated KYC application (ID: ${kycRecord._id}) for ${user.email} with status PENDING.`);

    console.log('\n--- Testing Admin KYC View (getKycRequestDetails) ---');
    const kycDetails = await kycAdminService.getKycRequestDetails(kycRecord._id as string);
    console.log('KYC Request Details:', JSON.stringify(kycDetails, null, 2));

    // Assertions to verify document URLs are present
    const nationalIdDoc = kycDetails.documents.find(d => d.documentType === 'NATIONAL_ID');
    const selfieDoc = kycDetails.documents.find(d => d.documentType === 'SELFIE');

    if (nationalIdDoc && nationalIdDoc.documentUrl === dummyDocumentUrl && nationalIdDoc.documentBackUrl === dummyDocumentBackUrl) {
      console.log('✅ NATIONAL_ID document URLs are correct.');
    } else {
      console.error('❌ NATIONAL_ID document URLs are INCORRECT or missing.');
    }
    if (selfieDoc && selfieDoc.documentUrl === dummySelfieUrl) {
      console.log('✅ SELFIE document URL is correct.');
    } else {
      console.error('❌ SELFIE document URL is INCORRECT or missing.');
    }

    console.log('\n--- Testing Admin KYC Approval (approveKycRequest) ---');
    const approvedResult = await kycAdminService.approveKycRequest(kycRecord._id as string, 'Looks good');
    console.log('Approval Result:', JSON.stringify(approvedResult, null, 2));
    const updatedKycRecord = await KycRecord.findById(kycRecord._id);
    if (updatedKycRecord?.status === 'VERIFIED') {
      console.log('✅ KYC record status updated to VERIFIED.');
    } else {
      console.error('❌ KYC record status NOT updated to VERIFIED.');
    }

  } catch (error) {
    console.error('Error during KYC admin test:', error);
  } finally {
    // Clean up test data
    const userToDelete = await User.findOne({ email: TEST_USER_EMAIL });
    if (userToDelete) {
      await KycDocument.deleteMany({ userId: userToDelete._id });
      await KycRecord.deleteMany({ userId: userToDelete._id });
      await User.deleteOne({ email: TEST_USER_EMAIL });
      console.log('Cleaned up test user and KYC data.');
    }
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit();
  }
};

runKycAdminTest();

import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';
import logger from './logger';

// Initialize S3 Client
const s3Client = new S3Client({
  region: env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY || '',
  },
});

interface UploadResult {
  Location: string;
  Key: string;
  Bucket: string;
}

/**
 * Uploads a file buffer to AWS S3.
 * @param file The file object from Multer (must contain .buffer, .originalname, .mimetype)
 * @param userId The ID of the user uploading the file (for organization)
 * @returns The public URL of the uploaded file
 */
export const uploadToS3 = async (
  file: Express.Multer.File,
  userId: string
): Promise<UploadResult> => {
  if (!env.S3_BUCKET_NAME) {
    throw new Error('S3_BUCKET_NAME is not configured.');
  }

  // Generate unique file key: kyc/<userId>/<uuid>-<originalName>
  const fileExtension = file.originalname.split('.').pop();
  const uniqueKey = `kyc/${userId}/${uuidv4()}-${file.originalname.replace(/\s+/g, '_')}`;

  try {
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: env.S3_BUCKET_NAME,
        Key: uniqueKey,
        Body: file.buffer,
        ContentType: file.mimetype,
        // ACL: 'public-read', // Uncomment if you want the object to be public immediately (requires bucket settings to allow this)
      },
    });

    const result = await upload.done();
    
    // Construct the public URL manually if Location is not returned (sometimes happens with newer SDKs depending on region)
    const location = result.Location || `https://${env.S3_BUCKET_NAME}.s3.${env.AWS_REGION}.amazonaws.com/${uniqueKey}`;

    logger.info(`File uploaded to S3: ${location}`);

    return {
      Location: location,
      Key: uniqueKey,
      Bucket: env.S3_BUCKET_NAME,
    };
  } catch (error) {
    logger.error('S3 Upload Error:', error);
    throw new Error('FILE_UPLOAD_FAILED');
  }
};

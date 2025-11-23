import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { logger } from './logger';
import * as fs from 'fs/promises';
import * as path from 'path';

// Check if AWS is configured
const AWS_CONFIGURED = !!(
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY &&
  process.env.S3_BUCKET_NAME
);

const s3Client = AWS_CONFIGURED ? new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
}) : null;

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'payout-documents';
const LOCAL_STORAGE_PATH = path.join(process.cwd(), 'storage', 'pdfs');

/**
 * Upload PDF to S3 or local storage
 */
export async function uploadPDF(
  pdfBuffer: Buffer,
  filename: string,
  folder: string = 'documents'
): Promise<string> {
  if (AWS_CONFIGURED && s3Client) {
    return uploadToS3(pdfBuffer, filename, folder);
  } else {
    return uploadToLocalStorage(pdfBuffer, filename, folder);
  }
}

/**
 * Upload PDF to S3
 */
async function uploadToS3(
  pdfBuffer: Buffer,
  filename: string,
  folder: string
): Promise<string> {
  try {
    const key = `${folder}/${filename}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
      ServerSideEncryption: 'AES256',
    });

    await s3Client!.send(command);

    const url = `https://${BUCKET_NAME}.s3.amazonaws.com/${key}`;

    logger.info('PDF uploaded to S3', {
      filename,
      folder,
      url,
    });

    return url;
  } catch (error) {
    logger.error('Failed to upload PDF to S3', {
      filename,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw new Error('Failed to upload PDF to S3');
  }
}

/**
 * Upload PDF to local storage (fallback)
 */
async function uploadToLocalStorage(
  pdfBuffer: Buffer,
  filename: string,
  folder: string
): Promise<string> {
  try {
    const folderPath = path.join(LOCAL_STORAGE_PATH, folder);
    await fs.mkdir(folderPath, { recursive: true });

    const filePath = path.join(folderPath, filename);
    await fs.writeFile(filePath, pdfBuffer);

    const url = `/storage/${folder}/${filename}`;

    logger.info('PDF uploaded to local storage', {
      filename,
      folder,
      path: filePath,
      url,
    });

    return url;
  } catch (error) {
    logger.error('Failed to upload PDF to local storage', {
      filename,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw new Error('Failed to upload PDF to local storage');
  }
}

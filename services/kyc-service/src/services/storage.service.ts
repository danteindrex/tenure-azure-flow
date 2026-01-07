import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export class StorageService {
    private s3Client: S3Client;
    private bucketName: string;

    constructor() {
        this.bucketName = process.env.SUPABASE_KYC_BUCKET || 'kyc-documents';

        const endpoint = process.env.SUPABASE_STORAGE_ENDPOINT;
        const region = process.env.SUPABASE_STORAGE_REGION || 'us-east-1';
        const accessKeyId = process.env.SUPABASE_STORAGE_ACCESS_KEY_ID;
        const secretAccessKey = process.env.SUPABASE_STORAGE_SECRET_ACCESS_KEY;

        console.log('🔧 StorageService (S3) Config:', {
            endpoint,
            region,
            hasAccessKey: !!accessKeyId,
            bucket: this.bucketName
        });

        if (!endpoint || !accessKeyId || !secretAccessKey) {
            throw new Error('Supabase S3 storage credentials are required');
        }

        this.s3Client = new S3Client({
            region,
            endpoint,
            forcePathStyle: true, // Required for Supabase Storage
            credentials: {
                accessKeyId,
                secretAccessKey
            }
        });
    }

    /**
     * Upload file to Supabase Storage (S3)
     * @param path File path in bucket (e.g., 'user_id/front.jpg')
     * @param fileBuffer File content buffer
     * @param contentType MIME type of the file
     */
    async uploadFile(path: string, fileBuffer: Buffer, contentType: string): Promise<string> {
        console.log(`📤 Uploading file to ${this.bucketName}/${path}`);

        const command = new PutObjectCommand({
            Bucket: this.bucketName,
            Key: path,
            Body: fileBuffer,
            ContentType: contentType,
            // ACL: 'public-read' // Uncomment if you want public access (but we want private usually)
        });

        try {
            await this.s3Client.send(command);
            console.log(`✅ File uploaded successfully: ${path}`);
            return path;
        } catch (error: any) {
            console.error('❌ S3 Upload Error:', error);
            throw new Error(`Failed to upload file: ${error.message}`);
        }
    }

    /**
     * Get a temporary signed URL for viewing the file
     * @param path File path in bucket
     */
    async getSignedUrl(path: string, expiresIn = 60 * 60): Promise<string> {
        const command = new GetObjectCommand({
            Bucket: this.bucketName,
            Key: path
        });

        try {
            return await getSignedUrl(this.s3Client, command, { expiresIn });
        } catch (error: any) {
            throw new Error(`Failed to create signed URL: ${error.message}`);
        }
    }
}

// Singleton instance
export const storageService = new StorageService();

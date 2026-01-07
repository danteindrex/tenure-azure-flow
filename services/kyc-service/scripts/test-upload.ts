import dotenv from 'dotenv';
import path from 'path';

// Load env vars from the root of the service
const envPath = path.resolve(__dirname, '../.env');
console.log('📁 Loading .env from:', envPath);
const result = dotenv.config({ path: envPath });

if (result.error) {
    console.error('⚠️ Error loading .env file:', result.error);
}

// import { storageService } from '../src/services/storage.service';

async function testUpload() {
    // Dynamically import service AFTER env vars are loaded
    const { storageService } = await import('../src/services/storage.service');

    console.log('🚀 Starting Supabase S3 Upload Test...');
    console.log('----------------------------------------');
    console.log('Bucket:', process.env.SUPABASE_KYC_BUCKET);
    console.log('Endpoint:', process.env.SUPABASE_STORAGE_ENDPOINT);
    console.log('Region:', process.env.SUPABASE_STORAGE_REGION);
    console.log('----------------------------------------');

    try {
        const testContent = Buffer.from('This is a test file pretending to be an image 📸');
        const timestamp = Date.now();
        const filename = `test-scripts/test_${timestamp}.jpg`;

        console.log(`📤 Attempting to upload ${filename}...`);

        // Test Upload
        const result = await storageService.uploadFile(filename, testContent, 'image/jpeg');
        console.log('\n✅ Upload successful!');
        console.log('Storage Key:', result);

        // Test Signed URL
        console.log('\n🔗 Generating signed URL...');
        const url = await storageService.getSignedUrl(result);
        console.log('✅ Signed URL generated successfully');
        console.log('URL:', url);

    } catch (error) {
        console.error('\n❌ Test Failed:', error);
        process.exit(1);
    }
}

testUpload();

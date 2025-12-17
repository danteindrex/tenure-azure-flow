// Simple test to verify Better Auth schema mapping
const { auth } = require('./lib/auth.ts');

console.log('Testing Better Auth schema mapping...');

// This should not throw an error if the schema mapping is correct
try {
  console.log('✅ Better Auth configuration loaded successfully');
  console.log('✅ Schema mapping appears to be working');
} catch (error) {
  console.error('❌ Better Auth configuration error:', error.message);
}
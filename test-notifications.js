/**
 * Test script for payment notifications
 * Run this to test the notification system at http://localhost:3005/dashboard/notifications
 */

const testNotifications = async () => {
  const baseUrl = 'http://localhost:3005';
  
  console.log('🧪 Testing Payment Notification System');
  console.log('=====================================');
  
  // Test data - replace with actual user ID from your system
  const testUserId = 'test-user-id'; // You'll need to replace this with a real user ID
  
  try {
    console.log('📡 Testing API endpoint...');
    
    // Test creating all notifications
    const response = await fetch(`${baseUrl}/api/notifications/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: testUserId,
        allScenarios: true
      })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Success:', result.message);
      console.log('📊 Created notifications:', result.notifications.length);
      console.log('🎯 Available scenarios:', result.scenarios_available.join(', '));
      
      console.log('\n🌐 Visit the notifications page to see the results:');
      console.log(`   ${baseUrl}/dashboard/notifications`);
      
      console.log('\n📋 Test Scenarios Created:');
      result.scenarios_available.forEach((scenario, index) => {
        console.log(`   ${index + 1}. ${scenario.replace(/_/g, ' ').toUpperCase()}`);
      });
      
    } else {
      console.error('❌ Error:', result.error);
      console.error('💡 Make sure you have a valid user ID and the server is running');
    }
    
  } catch (error) {
    console.error('❌ Network Error:', error.message);
    console.log('💡 Make sure the development server is running on port 3005');
    console.log('   Run: npm run dev or yarn dev');
  }
  
  console.log('\n🔧 Manual Testing Instructions:');
  console.log('1. Go to http://localhost:3005/dashboard/notifications');
  console.log('2. Click "Test Notifications" button');
  console.log('3. Use individual test buttons or "Create All Tests"');
  console.log('4. Verify notifications appear with correct business rule data');
  console.log('5. Test marking as read, dismissing, and deleting notifications');
  
  console.log('\n📋 Business Rules Being Tested:');
  console.log('• BR-1: Joining Fee ($300 one-time)');
  console.log('• BR-2: Monthly Fee ($25 recurring)');
  console.log('• BR-3: Payout Trigger ($100K + 12 months)');
  console.log('• BR-8: Default Penalty (30-day grace period)');
  console.log('• BR-9: Tenure from Payment Date');
};

// Run the test
testNotifications();

// Export for use in other scripts
module.exports = { testNotifications };
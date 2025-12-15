// Mock email service for development
export async function sendMockEmail(to: string, subject: string, html: string) {
  console.log('📧 Mock Email Service - Email would be sent:');
  console.log('To:', to);
  console.log('Subject:', subject);
  console.log('Content:', html);
  
  // For development, we'll just log the verification code
  const codeMatch = html.match(/verification code is:?\s*(\d{6})/i);
  if (codeMatch) {
    console.log('🔑 VERIFICATION CODE:', codeMatch[1]);
  }
  
  return { success: true, messageId: 'mock-' + Date.now() };
}
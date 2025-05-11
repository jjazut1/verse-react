/**
 * Test script for SendGrid email sending
 * Run with: npx ts-node src/testSendEmail.ts
 */

import { setupSendGrid, sendEmail } from './sendgridHelper';

async function runTest() {
  console.log('SendGrid Email Test - Starting...');
  
  // Check for API key in environment variable
  const apiKey = process.env.SENDGRID_API_KEY;
  const senderEmail = process.env.SENDER_EMAIL;
  const testRecipient = process.env.TEST_EMAIL || senderEmail;
  
  if (!apiKey) {
    console.error('Missing SENDGRID_API_KEY environment variable.');
    console.log('Run with: SENDGRID_API_KEY=your_key SENDER_EMAIL=your_verified_email npx ts-node src/testSendEmail.ts');
    process.exit(1);
  }
  
  if (!senderEmail) {
    console.error('Missing SENDER_EMAIL environment variable.');
    console.log('Run with: SENDGRID_API_KEY=your_key SENDER_EMAIL=your_verified_email npx ts-node src/testSendEmail.ts');
    process.exit(1);
  }
  
  console.log('Setting up SendGrid with provided API key...');
  const isSetupSuccessful = setupSendGrid(apiKey);
  
  if (!isSetupSuccessful) {
    console.error('Failed to set up SendGrid with the provided key. Check log for details.');
    process.exit(1);
  }
  
  // Test with simple format
  const simpleEmail = {
    to: testRecipient!,
    from: senderEmail,
    subject: 'SendGrid Test - Simple Format',
    html: '<p>This is a test email with simple format (from as string)</p>',
  };
  
  // Test with detailed format
  const detailedEmail = {
    to: testRecipient!,
    from: {
      email: senderEmail,
      name: 'Verse Learning Test',
    },
    subject: 'SendGrid Test - Detailed Format',
    html: '<p>This is a test email with detailed format (from as object)</p>',
  };
  
  try {
    console.log('\n--- Testing simple email format ---');
    const simpleResult = await sendEmail(simpleEmail);
    console.log('Simple format test result:', simpleResult ? 'SUCCESS' : 'FAILED');
    
    console.log('\n--- Testing detailed email format ---');
    const detailedResult = await sendEmail(detailedEmail);
    console.log('Detailed format test result:', detailedResult ? 'SUCCESS' : 'FAILED');
    
    console.log('\n--- Test Summary ---');
    console.log(`Simple format: ${simpleResult ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Detailed format: ${detailedResult ? '✅ SUCCESS' : '❌ FAILED'}`);
    
    console.log('\nCheck your inbox at:', testRecipient);
    
    if (!simpleResult && !detailedResult) {
      console.log('\n❗ All tests failed. Check logs for details.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Unexpected error during test:', error);
    process.exit(1);
  }
}

// Run the test
runTest().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 
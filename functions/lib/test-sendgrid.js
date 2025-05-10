// Test script for SendGrid API key verification
const sgMail = require('@sendgrid/mail');

// Use the API key directly
const SENDGRID_API_KEY = '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';
sgMail.setApiKey(SENDGRID_API_KEY);

// Create a test message
const msg = {
  to: 'james@learnwithverse.com', // Your email
  from: 'james@learnwithverse.com', // Must be verified sender
  subject: 'SendGrid API Key Test',
  text: 'This is a test to verify SendGrid API key',
  html: '<strong>This is a test to verify SendGrid API key</strong>',
};

// Send the test email
sgMail
  .send(msg)
  .then(() => {
    console.log('SendGrid API key is valid and email sent successfully');
  })
  .catch((error) => {
    console.error('Error with SendGrid API key:', error.toString());
    // Print more detailed error info if available
    if (error.response) {
      console.error('Error response body:', error.response.body);
    }
  }); 
# Setting Up SendGrid for Email Delivery

This document explains how to set up SendGrid for reliable email delivery from your Firebase Cloud Functions.

## Why SendGrid?

- **Reliability**: SendGrid is designed specifically for transactional emails with high deliverability rates
- **Free Tier**: SendGrid offers a free tier with 100 emails/day
- **Simple API**: SendGrid's API is straightforward to use with Node.js
- **Analytics**: Track email opens, clicks, and bounces
- **No Authentication Issues**: Uses API keys instead of passwords like Gmail

## Step 1: Create a SendGrid Account

1. Go to [SendGrid.com](https://sendgrid.com/) and sign up for a free account
2. Verify your account via email

## Step 2: Verify a Sender Identity

SendGrid requires you to verify the email address you'll send from:

1. In SendGrid dashboard, go to **Settings → Sender Authentication**
2. Click **Verify a Single Sender**
3. Fill out the form with your information:
   - From Name: "Verse Learning" (or your organization name)
   - From Email: Your verified business email
   - Reply To: Same as From Email (or support email)
   - Company Address: Your business address
   - City, State, Zip, Country: Your location
4. Click **Create**
5. Check the email account and click the verification link SendGrid sends

## Step 3: Create an API Key

1. In SendGrid dashboard, go to **Settings → API Keys**
2. Click **Create API Key**
3. Name it "Verse Firebase Functions"
4. Select **Restricted Access** and enable:
   - Mail Send: Full Access
5. Click **Create & View**
6. Copy the API key shown - you won't be able to see it again!

## Step 4: Set Up Firebase Functions

1. Make sure you have the SendGrid package installed:
   ```
   npm install @sendgrid/mail
   ```

2. Update your credentials using the script:
   ```
   chmod +x update-sendgrid-credentials.sh
   ./update-sendgrid-credentials.sh
   ```

3. When prompted:
   - Enter your verified sender email (from Step 2)
   - Enter your SendGrid API key (from Step 3)
   - Choose to redeploy functions

## Step 5: Testing the Integration

1. Test the email function directly:
   ```
   curl "https://us-central1-verse-11f2d.cloudfunctions.net/testEmail?email=your-email@example.com"
   ```

2. Or create a new assignment in the app, which should trigger an automatic email

## Troubleshooting

If emails aren't being sent:

1. Check Firebase function logs:
   ```
   firebase functions:log
   ```

2. Verify that:
   - The sender email is properly verified in SendGrid
   - The API key has "Mail Send" permissions
   - The API key is correctly set in Firebase
   - Your SendGrid account isn't suspended or limited

3. Try the SendGrid Event Webhook to get detailed delivery information:
   - In SendGrid, go to **Settings → Mail Settings → Event Webhook**
   - Set up a webhook endpoint to receive email delivery events

## Additional Resources

- [SendGrid Node.js SDK Documentation](https://github.com/sendgrid/sendgrid-nodejs)
- [SendGrid API Documentation](https://docs.sendgrid.com/api-reference/how-to-use-the-sendgrid-v3-api)
- [Email Deliverability Tips](https://sendgrid.com/blog/top-email-deliverability-tips/) 
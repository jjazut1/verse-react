"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSendGrid = setupSendGrid;
exports.sendEmail = sendEmail;
const sgMail = require("@sendgrid/mail");
const emailValidator_1 = require("./emailValidator");
function setupSendGrid(apiKey) {
    try {
        // Ensure the API key is a clean string without any invisible characters
        const cleanKey = apiKey.toString().trim();
        // Check if it matches the expected format (starting with SG.)
        if (!cleanKey.startsWith('SG.')) {
            console.error('Invalid SendGrid key format: Key does not start with SG.');
            return false;
        }
        // Extract the key components
        const parts = cleanKey.split('.');
        if (parts.length !== 3) {
            console.error('Invalid SendGrid key format: Expected 3 parts separated by dots.');
            return false;
        }
        // Check for valid Base64 URL-safe characters (a-z, A-Z, 0-9, -, _, =)
        const base64UrlSafeRegex = /^[A-Za-z0-9\-_=]+$/;
        if (!base64UrlSafeRegex.test(parts[1]) || !base64UrlSafeRegex.test(parts[2])) {
            console.error('Invalid SendGrid key format: Parts contain invalid characters.');
            return false;
        }
        // Log information about the key (without revealing it)
        console.log('SendGrid API key format verified:');
        console.log(`- Part 1 (SG): ${parts[0]}`);
        console.log(`- Part 2 length: ${parts[1].length} chars`);
        console.log(`- Part 3 length: ${parts[2].length} chars`);
        // Set the API key
        sgMail.setApiKey(cleanKey);
        console.log('SendGrid API key configured successfully');
        return true;
    }
    catch (error) {
        console.error('Error configuring SendGrid:', error);
        return false;
    }
}
/**
 * Clean an email address by removing whitespace and newlines
 */
function cleanEmailAddress(email) {
    if (!email)
        return '';
    // Remove whitespace, newlines, and carriage returns
    return email.replace(/[\s\n\r]/g, '');
}
async function sendEmail(message) {
    try {
        // Log the original payload (sanitized) for debugging
        console.log('Validating and sending email:');
        (0, emailValidator_1.logEmailPayload)(message);
        // Pre-clean email addresses to catch any whitespace not handled by validation
        let cleanedMessage = Object.assign({}, message);
        // Clean 'to' field
        if (typeof cleanedMessage.to === 'string') {
            cleanedMessage.to = cleanEmailAddress(cleanedMessage.to);
        }
        else if (Array.isArray(cleanedMessage.to)) {
            cleanedMessage.to = cleanedMessage.to.map((recipient) => {
                if (typeof recipient === 'string') {
                    return cleanEmailAddress(recipient);
                }
                else if (recipient && typeof recipient === 'object' && recipient.email) {
                    return Object.assign(Object.assign({}, recipient), { email: cleanEmailAddress(recipient.email) });
                }
                return recipient;
            });
        }
        // Clean 'from' field
        if (typeof cleanedMessage.from === 'string') {
            cleanedMessage.from = cleanEmailAddress(cleanedMessage.from);
        }
        else if (cleanedMessage.from && typeof cleanedMessage.from === 'object') {
            if (cleanedMessage.from.email) {
                cleanedMessage.from = Object.assign(Object.assign({}, cleanedMessage.from), { email: cleanEmailAddress(cleanedMessage.from.email) });
            }
        }
        // Validate the email data before sending
        const validationResult = (0, emailValidator_1.validateEmailData)(cleanedMessage);
        if (!validationResult.isValid) {
            console.error('Email validation failed:', validationResult.errors);
            return false;
        }
        // Get validated data (this maintains the correct typing for SendGrid)
        const validatedMessage = validationResult.data;
        // Ensure from field is correctly formatted
        const fromEmail = typeof validatedMessage.from === 'string'
            ? validatedMessage.from
            : validatedMessage.from.email;
        // Create the final message with defaults for any missing fields
        const finalMessage = Object.assign(Object.assign({}, validatedMessage), { from: typeof validatedMessage.from === 'string'
                ? validatedMessage.from
                : validatedMessage.from, subject: validatedMessage.subject || 'No subject', html: validatedMessage.html || '<p>No content provided</p>' });
        console.log('Sending email with SendGrid client');
        console.log(`To: ${typeof finalMessage.to === 'string' ? finalMessage.to : JSON.stringify(finalMessage.to)}`);
        console.log(`From email: ${fromEmail}`);
        console.log(`Subject: ${finalMessage.subject}`);
        // Use the standard client with validated data
        const [response] = await sgMail.send(finalMessage);
        console.log('Email sent successfully:', response.statusCode);
        return true;
    }
    catch (error) {
        console.error('Error sending email in helper:', error);
        // Log detailed error information
        if (error.response) {
            console.error('SendGrid API Error Details:');
            console.error(`Status code: ${error.code}`);
            // Log full response body for debugging
            if (error.response.body) {
                console.error('Full SendGrid error response:', JSON.stringify(error.response.body));
            }
        }
        return false;
    }
}
//# sourceMappingURL=sendgridHelper.js.map
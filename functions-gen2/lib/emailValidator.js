"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailSchema = void 0;
exports.validateEmailData = validateEmailData;
exports.logEmailPayload = logEmailPayload;
const zod_1 = require("zod");
// Define the validation schema for email data
exports.emailSchema = zod_1.z.object({
    to: zod_1.z.union([
        zod_1.z.string().trim().email('Invalid recipient email'),
        zod_1.z.array(zod_1.z.string().trim().email('Invalid recipient email')),
        zod_1.z.array(zod_1.z.object({
            email: zod_1.z.string().trim().email('Invalid recipient email'),
            name: zod_1.z.string().optional()
        }))
    ]),
    from: zod_1.z.union([
        zod_1.z.string().trim().email('Invalid sender email'),
        zod_1.z.object({
            email: zod_1.z.string().trim().email('Invalid sender email'),
            name: zod_1.z.string().optional()
        })
    ]),
    subject: zod_1.z.string().min(1, 'Subject cannot be empty'),
    html: zod_1.z.string().min(1, 'Email content cannot be empty'),
    text: zod_1.z.string().optional(),
});
/**
 * Validates email data against the schema
 * @param data Email data to validate
 * @returns Validation result with success flag and either validated data or error
 */
function validateEmailData(data) {
    try {
        // Pre-process data to clean email fields if they're strings
        let cleanedData = Object.assign({}, data);
        // Clean the 'to' field
        if (typeof cleanedData.to === 'string') {
            cleanedData.to = cleanedData.to.trim();
        }
        else if (Array.isArray(cleanedData.to)) {
            cleanedData.to = cleanedData.to.map((recipient) => {
                if (typeof recipient === 'string') {
                    return recipient.trim();
                }
                else if (recipient && typeof recipient === 'object' && recipient.email) {
                    return Object.assign(Object.assign({}, recipient), { email: recipient.email.trim() });
                }
                return recipient;
            });
        }
        // Clean the 'from' field
        if (typeof cleanedData.from === 'string') {
            cleanedData.from = cleanedData.from.trim();
        }
        else if (cleanedData.from && typeof cleanedData.from === 'object' && cleanedData.from.email) {
            cleanedData.from = Object.assign(Object.assign({}, cleanedData.from), { email: cleanedData.from.email.trim() });
        }
        // Validate the cleaned data
        const validatedData = exports.emailSchema.parse(cleanedData);
        return { isValid: true, data: validatedData };
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
            return { isValid: false, errors: errorMessages };
        }
        return {
            isValid: false,
            errors: ['Unknown validation error occurred']
        };
    }
}
/**
 * Logs email data for debugging purposes (without exposing sensitive parts)
 * @param data Email data to log
 */
function logEmailPayload(data) {
    // Create a safe copy of the data for logging
    const safeCopy = Object.assign({}, data);
    // Mask the email addresses for privacy in logs
    if (typeof safeCopy.to === 'string') {
        safeCopy.to = maskEmail(safeCopy.to);
    }
    else if (Array.isArray(safeCopy.to)) {
        safeCopy.to = safeCopy.to.map((recipient) => {
            if (typeof recipient === 'string') {
                return maskEmail(recipient);
            }
            else if (recipient && typeof recipient === 'object') {
                return Object.assign(Object.assign({}, recipient), { email: maskEmail(recipient.email) });
            }
            return recipient;
        });
    }
    // Mask sender email
    if (typeof safeCopy.from === 'string') {
        safeCopy.from = maskEmail(safeCopy.from);
    }
    else if (safeCopy.from && typeof safeCopy.from === 'object') {
        safeCopy.from = Object.assign(Object.assign({}, safeCopy.from), { email: maskEmail(safeCopy.from.email) });
    }
    // Log the sanitized payload
    console.log('Email payload for debugging:', JSON.stringify(safeCopy, null, 2));
}
/**
 * Masks an email address for privacy in logs
 * @param email Email to mask
 * @returns Masked email
 */
function maskEmail(email) {
    if (!email || typeof email !== 'string')
        return '[invalid email]';
    const parts = email.split('@');
    if (parts.length !== 2)
        return '[invalid email format]';
    const [username, domain] = parts;
    const maskedUsername = username.length > 3
        ? `${username.slice(0, 2)}***${username.slice(-1)}`
        : `${username[0]}***`;
    return `${maskedUsername}@${domain}`;
}
//# sourceMappingURL=emailValidator.js.map
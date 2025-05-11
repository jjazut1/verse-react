"use strict";
/**
 * Simple script to validate SendGrid API key format
 * Run with: SENDGRID_API_KEY=your_key npx ts-node src/validateApiKey.ts
 */
function validateSendGridApiKey(apiKey) {
    var _a, _b;
    console.log('\nSendGrid API Key Validator');
    console.log('------------------------');
    // Remove any quotes, spacing or invisible characters
    const cleanKey = apiKey.toString().trim().replace(/^['"]|['"]$/g, '');
    console.log(`Input key length: ${apiKey.length} characters`);
    console.log(`Cleaned key length: ${cleanKey.length} characters`);
    // Check if it starts with SG.
    if (!cleanKey.startsWith('SG.')) {
        console.log('❌ ERROR: Key does not start with "SG."');
        console.log(`Key starts with: ${cleanKey.slice(0, 3)}`);
    }
    else {
        console.log('✓ Key starts with "SG." (correct)');
    }
    // Split and check the parts
    const parts = cleanKey.split('.');
    console.log(`Number of parts: ${parts.length} (should be 3)`);
    if (parts.length === 3) {
        console.log('✓ Key has 3 parts separated by dots (correct)');
        // Check each part
        console.log('\nPart details:');
        console.log(`1. "${parts[0]}" (should be "SG")`);
        console.log(`2. Length: ${((_a = parts[1]) === null || _a === void 0 ? void 0 : _a.length) || 0} characters`);
        console.log(`3. Length: ${((_b = parts[2]) === null || _b === void 0 ? void 0 : _b.length) || 0} characters`);
        // Validate character set for Base64 URL-safe
        const base64UrlSafeRegex = /^[A-Za-z0-9\-_=]+$/;
        const part2Valid = base64UrlSafeRegex.test(parts[1]);
        const part3Valid = base64UrlSafeRegex.test(parts[2]);
        if (part2Valid) {
            console.log('✓ Part 2 contains valid Base64 URL-safe characters');
        }
        else {
            console.log('❌ ERROR: Part 2 contains invalid characters for Base64 URL-safe');
            findInvalidChars(parts[1], true);
        }
        if (part3Valid) {
            console.log('✓ Part 3 contains valid Base64 URL-safe characters');
        }
        else {
            console.log('❌ ERROR: Part 3 contains invalid characters for Base64 URL-safe');
            findInvalidChars(parts[2], true);
        }
        // Check for newlines or spaces inside the key
        checkForProblematicChars(cleanKey);
        if (parts[0] === 'SG' && part2Valid && part3Valid) {
            console.log('\n✅ VALID: The API key format appears to be valid');
            console.log('This key should work with SendGrid.');
        }
        else {
            console.log('\n❌ INVALID: The API key format has issues');
            console.log('RECOMMENDATION: Obtain a new API key from your SendGrid account dashboard.');
            console.log('Go to: https://app.sendgrid.com/settings/api_keys and create a new key.');
        }
    }
    else {
        console.log('❌ ERROR: Key does not have 3 parts separated by dots');
    }
}
/**
 * Find and report invalid characters in a string
 */
function findInvalidChars(text, urlSafe = false) {
    // URL-safe Base64 includes '-' and '_' characters
    const validChars = urlSafe ? /[A-Za-z0-9\-_=]/ : /[A-Za-z0-9+/=]/;
    const invalidChars = [];
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (!validChars.test(char)) {
            invalidChars.push({
                char,
                position: i,
                code: char.charCodeAt(0)
            });
        }
    }
    if (invalidChars.length > 0) {
        console.log('  Invalid characters found:');
        invalidChars.forEach(ic => {
            console.log(`  - Position ${ic.position}: '${ic.char}' (code: ${ic.code})`);
        });
    }
}
/**
 * Check for problematic characters like newlines or spaces
 */
function checkForProblematicChars(key) {
    if (key.includes(' ')) {
        console.log('❌ WARNING: Key contains spaces which can cause problems');
    }
    if (key.includes('\n')) {
        console.log('❌ WARNING: Key contains newlines which can cause problems');
    }
    if (key.includes('\r')) {
        console.log('❌ WARNING: Key contains carriage returns which can cause problems');
    }
}
// Main execution
const apiKey = process.env.SENDGRID_API_KEY;
if (!apiKey) {
    console.error('Error: SENDGRID_API_KEY environment variable is not set');
    console.error('Run with: SENDGRID_API_KEY=your_key npx ts-node src/validateApiKey.ts');
    process.exit(1);
}
validateSendGridApiKey(apiKey);
//# sourceMappingURL=validateApiKey.js.map
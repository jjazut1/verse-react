import { z } from 'zod';

// Define the validation schema for email data
export const emailSchema = z.object({
  to: z.union([
    z.string().trim().email('Invalid recipient email'),
    z.array(z.string().trim().email('Invalid recipient email')),
    z.array(z.object({
      email: z.string().trim().email('Invalid recipient email'),
      name: z.string().optional()
    }))
  ]),
  from: z.union([
    z.string().trim().email('Invalid sender email'),
    z.object({
      email: z.string().trim().email('Invalid sender email'),
      name: z.string().optional()
    })
  ]),
  subject: z.string().min(1, 'Subject cannot be empty'),
  html: z.string().min(1, 'Email content cannot be empty'),
  text: z.string().optional(),
});

// Type for email data
export type EmailData = z.infer<typeof emailSchema>;

/**
 * Validates email data against the schema
 * @param data Email data to validate
 * @returns Validation result with success flag and either validated data or error
 */
export function validateEmailData(data: any): { 
  isValid: boolean; 
  data?: EmailData; 
  errors?: string[] 
} {
  try {
    // Pre-process data to clean email fields if they're strings
    let cleanedData = { ...data };
    
    // Clean the 'to' field
    if (typeof cleanedData.to === 'string') {
      cleanedData.to = cleanedData.to.trim();
    } else if (Array.isArray(cleanedData.to)) {
      cleanedData.to = cleanedData.to.map((recipient: any) => {
        if (typeof recipient === 'string') {
          return recipient.trim();
        } else if (recipient && typeof recipient === 'object' && recipient.email) {
          return { ...recipient, email: recipient.email.trim() };
        }
        return recipient;
      });
    }
    
    // Clean the 'from' field
    if (typeof cleanedData.from === 'string') {
      cleanedData.from = cleanedData.from.trim();
    } else if (cleanedData.from && typeof cleanedData.from === 'object' && cleanedData.from.email) {
      cleanedData.from = { 
        ...cleanedData.from, 
        email: cleanedData.from.email.trim() 
      };
    }
    
    // Validate the cleaned data
    const validatedData = emailSchema.parse(cleanedData);
    return { isValid: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      );
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
export function logEmailPayload(data: any): void {
  // Create a safe copy of the data for logging
  const safeCopy = { ...data };
  
  // Mask the email addresses for privacy in logs
  if (typeof safeCopy.to === 'string') {
    safeCopy.to = maskEmail(safeCopy.to);
  } else if (Array.isArray(safeCopy.to)) {
    safeCopy.to = safeCopy.to.map((recipient: any) => {
      if (typeof recipient === 'string') {
        return maskEmail(recipient);
      } else if (recipient && typeof recipient === 'object') {
        return { ...recipient, email: maskEmail(recipient.email) };
      }
      return recipient;
    });
  }
  
  // Mask sender email
  if (typeof safeCopy.from === 'string') {
    safeCopy.from = maskEmail(safeCopy.from);
  } else if (safeCopy.from && typeof safeCopy.from === 'object') {
    safeCopy.from = { 
      ...safeCopy.from, 
      email: maskEmail(safeCopy.from.email) 
    };
  }
  
  // Log the sanitized payload
  console.log('Email payload for debugging:', JSON.stringify(safeCopy, null, 2));
}

/**
 * Masks an email address for privacy in logs
 * @param email Email to mask
 * @returns Masked email
 */
function maskEmail(email: string): string {
  if (!email || typeof email !== 'string') return '[invalid email]';
  
  const parts = email.split('@');
  if (parts.length !== 2) return '[invalid email format]';
  
  const [username, domain] = parts;
  const maskedUsername = username.length > 3 
    ? `${username.slice(0, 2)}***${username.slice(-1)}`
    : `${username[0]}***`;
  
  return `${maskedUsername}@${domain}`;
} 
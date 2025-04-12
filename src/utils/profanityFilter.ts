// Basic profanity list - extend as needed
const profanityList = [
  'ass',
  'fuck',
  'shit',
  'bitch',
  'piss',
  'dick',
  'cunt',
  // Add more words as needed
];

// Common letter substitutions
const substitutions: { [key: string]: string[] } = {
  'a': ['@', '4', 'α', 'а'],
  'i': ['1', '!', '|', 'і'],
  'o': ['0', 'о', 'θ'],
  'u': ['υ', 'ų'],
  'e': ['3', 'е', 'э'],
  's': ['$', '5', 'ѕ'],
  // Add more substitutions as needed
};

// Create regex patterns that account for common substitutions
const createRegexPattern = (word: string): RegExp => {
  let pattern = '';
  for (const char of word.toLowerCase()) {
    if (char in substitutions) {
      pattern += `[${char}${substitutions[char].join('')}]`;
    } else {
      pattern += char;
    }
  }
  return new RegExp(pattern, 'i');
};

// Generate regex patterns for each word
const profanityPatterns = profanityList.map(createRegexPattern);

export const isProfanity = (text: string): boolean => {
  const normalized = text.toLowerCase();
  
  // Check direct matches
  if (profanityList.some(word => normalized.includes(word))) {
    return true;
  }
  
  // Check pattern matches
  if (profanityPatterns.some(pattern => pattern.test(normalized))) {
    return true;
  }
  
  // Check for repeated characters (potential obfuscation)
  const repeatedChars = /(.)\1{3,}/;
  if (repeatedChars.test(normalized)) {
    return true;
  }
  
  return false;
};

export const sanitizeName = (name: string): string => {
  // Remove extra spaces
  let sanitized = name.trim().replace(/\s+/g, ' ');
  
  // Remove non-alphanumeric characters (except spaces)
  sanitized = sanitized.replace(/[^a-zA-Z0-9\s]/g, '');
  
  return sanitized;
};

export const isValidPlayerName = (name: string): boolean => {
  const sanitized = sanitizeName(name);
  
  // Check length
  if (sanitized.length < 3 || sanitized.length > 12) {
    return false;
  }
  
  // Check for profanity
  if (isProfanity(sanitized)) {
    return false;
  }
  
  return true;
}; 
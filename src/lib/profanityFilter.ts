// Basic profanity filter for SPORTIQ
// This list can be expanded as needed

const BLOCKED_WORDS = [
  // Common English profanity
  'fuck', 'shit', 'ass', 'bitch', 'damn', 'crap', 'bastard', 'dick', 'cock', 'pussy',
  'asshole', 'bullshit', 'motherfucker', 'fucker', 'fucking', 'fck', 'fuk', 'wtf',
  // Slurs and hate speech
  'nigger', 'nigga', 'faggot', 'retard', 'cunt',
  // Hindi profanity
  'bhenchod', 'bhosdike', 'madarchod', 'chutiya', 'gandu', 'lauda', 'lund', 'randi',
  'bc', 'mc', 'gaand', 'chut', 'lavda', 'behenchod', 'maderchod',
  // Variations
  'b*tch', 'f*ck', 's*it', 'a$$', 'd!ck',
];

// Check if text contains profanity
export function containsProfanity(text: string): boolean {
  if (!text) return false;
  
  const normalizedText = text.toLowerCase()
    .replace(/[0-9]/g, (match) => {
      const replacements: Record<string, string> = {
        '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b'
      };
      return replacements[match] || match;
    })
    .replace(/[^a-z\s]/g, '');
  
  return BLOCKED_WORDS.some(word => {
    const regex = new RegExp(`\\b${word}\\b|${word}`, 'i');
    return regex.test(normalizedText);
  });
}

// Get clean version or flag for moderation
export function filterProfanity(text: string): { clean: boolean; flagged: boolean } {
  const hasProfanity = containsProfanity(text);
  return {
    clean: !hasProfanity,
    flagged: hasProfanity
  };
}

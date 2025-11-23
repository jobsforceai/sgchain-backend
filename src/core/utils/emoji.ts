import fs from 'fs';
import path from 'path';
import logger from './logger';

let fullEmojiSet: string[] | null = null;
let emojiLookupSet: Set<string> | null = null;

const SPIRITUAL_SET = [
  "🕉️", "☸️", "🛕", "🪔", "📿", "🧘", "🧿", "🪬", "🛐", "🕯️", "☯️", "✡️", "☦️", "✝️", "☪️", "🕎"
];

const MUDRA_SET = [
  "🙏", "🤲", "👐", "🫴", "🫳", "🫱", "🫲", "✋", "🤚", "🖐", "👋", "☝️", "👆", "👇", "👈", "👉", "🫵", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "🤝", "✍️", "💪", "🤳", "🫶", "🖖", "🖕"
];

export const getEmojiSets = () => {
  if (!fullEmojiSet) {
    try {
      const filePath = path.join(process.cwd(), 'src/core/data/emoji-test.txt');
      const file = fs.readFileSync(filePath, 'utf8');
      const emojis: string[] = [];

      const lines = file.split('\n');
      for (const line of lines) {
        if (!line.trim() || line.startsWith('#')) continue;

        // Line format: "1F600 ; fully-qualified # 😀 grinning face"
        const parts = line.split(';');
        if (parts.length < 2) continue;

        const codepointsPart = parts[0].trim();
        const rest = parts[1];
        const status = rest.split('#')[0].trim();

        if (status !== 'fully-qualified') continue;

        const codepoints = codepointsPart.split(' ');
        const emojiChar = String.fromCodePoint(...codepoints.map(cp => parseInt(cp, 16)));
        emojis.push(emojiChar);
      }
      fullEmojiSet = emojis;
      emojiLookupSet = new Set(emojis);
      logger.info(`Loaded ${fullEmojiSet.length} emojis from file.`);
    } catch (error) {
      logger.error('Failed to load emoji data:', error);
      fullEmojiSet = []; // Fallback to empty or handle error
      emojiLookupSet = new Set();
    }
  }

  return {
    spiritual: SPIRITUAL_SET,
    mudra: MUDRA_SET,
    fullSet: fullEmojiSet || []
  };
};

export const validatePinCharacters = (pin: string): boolean => {
  // Load set if not already loaded
  const { fullSet } = getEmojiSets();
  
  // Use spread syntax to correctly iterate over unicode characters (emojis)
  const characters = [...pin];
  
  if (characters.length !== 4) return false;

  const validationSet = emojiLookupSet || new Set(fullSet);
  
  for (const char of characters) {
    if (!validationSet.has(char)) return false;
  }
  
  return true;
};

import fs from 'fs';
import path from 'path';
import logger from './logger';

let fullEmojiSet: string[] | null = null;
let emojiLookupSet: Set<string> | null = null;
let categorizedEmojis: any[] | null = null;

export const getEmojiSets = () => {
  if (!fullEmojiSet) {
    try {
      const filePath = path.join(process.cwd(), 'src/core/data/categorized-emojis.json');
      const file = fs.readFileSync(filePath, 'utf8');
      categorizedEmojis = JSON.parse(file);
      
      const emojis: string[] = [];
      if (categorizedEmojis) {
        for (const group of categorizedEmojis) {
          for (const category of group.categories) {
            for (const emoji of category.emojis) {
              emojis.push(emoji.char);
            }
          }
        }
      }

      fullEmojiSet = emojis;
      emojiLookupSet = new Set(emojis);
      logger.info(`Loaded ${fullEmojiSet.length} emojis from file.`);
    } catch (error) {
      logger.error('Failed to load emoji data:', error);
      fullEmojiSet = []; // Fallback to empty or handle error
      emojiLookupSet = new Set();
      categorizedEmojis = [];
    }
  }

  return {
    categorized: categorizedEmojis,
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


import { getEmojiSets } from '../core/utils/emoji';

// Manually mock process.cwd() if running via ts-node in a weird environment, 
// but usually it's correct. 
// Just in case, let's log it.
console.log('Current Working Directory:', process.cwd());

try {
  console.log('--- Testing getEmojiSets() ---');
  const result = getEmojiSets();
  
  console.log('Full Set Length:', result.fullSet.length);
  
  if (result.categorized && result.categorized.length > 0) {
    console.log('Categorized Groups:', result.categorized.length);
    console.log('First Group Name:', result.categorized[0].name);
    console.log('First Category Name:', result.categorized[0].categories[0].name);
    console.log('First Emoji Char:', result.categorized[0].categories[0].emojis[0].char);
  } else {
    console.error('Categorized array is empty or null!');
  }

  if (result.fullSet.length === 0) {
    console.error('Full Set is empty!');
  } else {
    console.log('✅ Emoji data loaded successfully.');
  }

} catch (err) {
  console.error('CRITICAL ERROR in script:', err);
}

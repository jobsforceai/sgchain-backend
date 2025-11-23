import { Request, Response } from 'express';
import { getEmojiSets } from 'core/utils/emoji';

export const getEmojiConfig = (req: Request, res: Response) => {
  const sets = getEmojiSets();
  res.json(sets);
};

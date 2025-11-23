import { Router } from 'express';
import * as configController from 'user/controllers/config.controller';

const router = Router();

router.get('/emojis', configController.getEmojiConfig);

export { router };

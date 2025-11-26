import { Router } from 'express';
import * as marketController from 'market/controllers/market.controller';

const router = Router();

router.get('/candles', marketController.getCandles);

export { router };

import { Router } from 'express';
import * as swapController from 'swap/controllers/swap.controller';
import { authUser } from 'core/middlewares/authUser';
import { authWalletAccess } from 'core/middlewares/authWalletAccess';
import { validate } from 'core/middlewares/validate';
import { executeSwapValidator } from 'swap/validators/swap.validator';

const router = Router();

// Execute Swap (Requires PIN-verified token)
router.post(
  '/execute',
  authWalletAccess,
  validate(executeSwapValidator),
  swapController.executeSwap
);

// Get Quote (Standard Auth)
router.get('/quote', authUser, swapController.getQuote);

export { router };

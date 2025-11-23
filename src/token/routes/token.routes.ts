import { Router } from 'express';
import * as tokenController from 'token/controllers/tokenLaunch.controller';
import { authUser } from 'core/middlewares/authUser';
import { validate } from 'core/middlewares/validate';
import { createTokenDraftValidator, updateTokenDraftValidator } from 'token/validators/tokenLaunch.validator';

const router = Router();

// List user's tokens
router.get('/my-tokens', authUser, tokenController.listMyTokens);

// Create Draft
router.post(
  '/',
  authUser,
  validate(createTokenDraftValidator),
  tokenController.createDraft
);

// Get Details
router.get('/:id', authUser, tokenController.getDetails);

// Update Draft
router.put(
  '/:id',
  authUser,
  validate(updateTokenDraftValidator),
  tokenController.updateDraft
);

// Submit for Deployment
router.post(
  '/:id/submit',
  authUser,
  tokenController.submitToken
);

export { router };

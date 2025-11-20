import { Router } from 'express';
import * as authController from 'user/controllers/auth.controller';
import { validate } from 'core/middlewares/validate';
import {
  registerValidator,
  requestOtpValidator,
  loginValidator,
} from 'user/validators/auth.validator';

const router = Router();

router.post(
  '/register',
  validate(registerValidator),
  authController.register
);
router.post(
  '/otp/request',
  validate(requestOtpValidator),
  authController.requestOtp
);
router.post('/login', validate(loginValidator), authController.login);

export { router as authRouter };

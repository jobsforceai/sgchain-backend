import { Router } from 'express';
import * as adminAuthController from 'admin/controllers/adminAuth.controller';
import * as pricingController from 'admin/controllers/pricing.controller';
import * as adminUsersController from 'admin/controllers/adminUsers.controller';
import * as adminTransfersController from 'admin/controllers/adminTransfers.controller';
import * as buyController from 'admin/controllers/buy.controller';
import * as withdrawalAdminController from 'admin/controllers/withdrawalAdmin.controller';
import * as kycAdminController from 'admin/controllers/kycAdmin.controller';
import { authAdmin } from 'core/middlewares/authAdmin';
import { validate } from 'core/middlewares/validate';
import { pricingValidator } from 'admin/validators/pricing.validator';
import { manualAdjustValidator } from 'admin/validators/manualAdjust.validator';

const router = Router();

router.post('/auth/login', adminAuthController.login);

router.post(
  '/price',
  authAdmin(['SUPERADMIN', 'FINANCE']),
  validate(pricingValidator),
  pricingController.setPrice
);

router.get(
  '/users/:userId/wallet',
  authAdmin(['SUPERADMIN', 'FINANCE', 'SUPPORT']),
  adminUsersController.getUserWallet
);

router.post(
  '/users/:userId/wallet/manual-adjust',
  authAdmin(['SUPERADMIN', 'FINANCE']),
  validate(manualAdjustValidator),
  adminUsersController.manualAdjust
);

// Buy SGC Admin Flow
router.get(
  '/buy-sgc/requests',
  authAdmin(['SUPERADMIN', 'FINANCE']),
  buyController.listBuyRequests
);
router.post(
  '/buy-sgc/requests/:id/approve',
  authAdmin(['SUPERADMIN', 'FINANCE']),
  buyController.approveBuyRequest
);
router.post(
  '/buy-sgc/requests/:id/reject',
  authAdmin(['SUPERADMIN', 'FINANCE']),
  buyController.rejectBuyRequest
);

// Admin Withdrawal Management
router.get(
  '/withdrawals',
  authAdmin(['SUPERADMIN', 'FINANCE']),
  withdrawalAdminController.getWithdrawalRequests
);
router.post(
  '/withdrawals/:id/approve',
  authAdmin(['SUPERADMIN', 'FINANCE']),
  withdrawalAdminController.approveWithdrawal
);
router.post(
  '/withdrawals/:id/reject',
  authAdmin(['SUPERADMIN', 'FINANCE']),
  withdrawalAdminController.rejectWithdrawal
);

// Admin KYC Management
router.get('/kyc/requests', authAdmin(['SUPERADMIN', 'KYC_ADMIN']), kycAdminController.getKycRequests);
router.get('/kyc/requests/:id', authAdmin(['SUPERADMIN', 'KYC_ADMIN']), kycAdminController.getKycRequestDetails);
router.post('/kyc/requests/:id/approve', authAdmin(['SUPERADMIN', 'KYC_ADMIN']), kycAdminController.approveKycRequest);
router.post('/kyc/requests/:id/reject', authAdmin(['SUPERADMIN', 'KYC_ADMIN']), kycAdminController.rejectKycRequest);

export { router };
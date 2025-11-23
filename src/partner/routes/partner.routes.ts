import { Router } from 'express';
import * as healthController from 'partner/controllers/health.controller';
import * as externalTransferPartnerController from 'partner/controllers/externalTransferPartner.controller';

const router = Router();

router.get('/health', healthController.healthCheck);
router.post('/sgtrading/redeem', externalTransferPartnerController.redeemCode);

export { router };

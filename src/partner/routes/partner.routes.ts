import { Router } from 'express';
import * as healthController from 'partner/controllers/health.controller';

const router = Router();

router.get('/health', healthController.healthCheck);

export { router };

import { Router } from 'express';
import { router as userRoutes } from 'user/routes/user.routes';
import { authRouter } from 'user/routes/auth.routes';
import { router as adminRoutes } from 'admin/routes/admin.routes';
import { router as partnerRoutes } from 'partner/routes/partner.routes';
import { router as tokenRoutes } from 'token/routes/token.routes';
import { router as swapRoutes } from 'swap/routes/swap.routes';
import { router as configRoutes } from 'user/routes/config.routes';
import { router as marketRoutes } from 'market/routes/market.routes';

const router = Router();

router.use('/api', userRoutes);
router.use('/api/auth', authRouter);
router.use('/admin', adminRoutes);
router.use('/partner', partnerRoutes);
router.use('/api/tokens', tokenRoutes);
router.use('/api/swap', swapRoutes);
router.use('/api/config', configRoutes);
router.use('/api/v1/market', marketRoutes);

export { router };
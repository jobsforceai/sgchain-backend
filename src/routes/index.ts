import { Router } from 'express';
import { router as userRoutes } from 'user/routes/user.routes';
import { authRouter } from 'user/routes/auth.routes';
import { router as adminRoutes } from 'admin/routes/admin.routes';
import { router as partnerRoutes } from 'partner/routes/partner.routes';

const router = Router();

router.use('/api', userRoutes);
router.use('/api/auth', authRouter);
router.use('/admin', adminRoutes);
router.use('/partner', partnerRoutes);

export { router };


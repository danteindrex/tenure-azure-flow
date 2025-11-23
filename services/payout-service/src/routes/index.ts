import { Router } from 'express';
import { validateSession } from '../config/auth';
import eligibilityRoutes from './eligibility.routes';
import payoutRoutes from './payout.routes';

const router = Router();

// Health check endpoint (no auth required)
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'payout-service',
    timestamp: new Date().toISOString(),
  });
});

// Protected routes (require authentication via Better Auth session)
router.use('/eligibility', validateSession, eligibilityRoutes);
router.use('/payouts', validateSession, payoutRoutes);

export default router;

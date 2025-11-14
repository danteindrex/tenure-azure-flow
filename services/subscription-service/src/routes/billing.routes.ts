import { Router, type Router as RouterType } from 'express';
import { BillingController } from '../controllers/billing.controller';
import { validateSession } from '../middleware/auth.middleware';

const router: RouterType = Router();

// Get billing schedules for a user (protected)
router.get('/schedules/:userId', validateSession, BillingController.getBillingSchedules);

export default router;

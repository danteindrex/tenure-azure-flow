import express from 'express';
import QueueController from '../controllers/queueController';
import { validateSession } from '../middleware/auth.middleware';

const router = express.Router();
const queueController = new QueueController();

// Bind methods to maintain 'this' context
const bindMethod = (method: any) => method.bind(queueController);

// Queue routes (all protected with Better Auth session validation)
router.get('/', validateSession, bindMethod(queueController.getQueue));
router.get('/statistics', validateSession, bindMethod(queueController.getStatistics));
router.get('/health', bindMethod(queueController.healthCheck)); // Health check doesn't need auth
router.get('/:memberId', validateSession, bindMethod(queueController.getQueueMember));

// Admin routes (for queue management)
router.put('/:memberId/position', validateSession, bindMethod(queueController.updateQueuePosition));
router.post('/', validateSession, bindMethod(queueController.addMemberToQueue));
router.delete('/:memberId', validateSession, bindMethod(queueController.removeMemberFromQueue));

export default router;
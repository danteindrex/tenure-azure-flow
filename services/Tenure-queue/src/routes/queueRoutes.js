const express = require('express');
const QueueController = require('../controllers/queueController');

const router = express.Router();
const queueController = new QueueController();

// Bind methods to maintain 'this' context
const bindMethod = (method) => method.bind(queueController);

// Queue routes
router.get('/', bindMethod(queueController.getQueue));
router.get('/statistics', bindMethod(queueController.getStatistics));
router.get('/health', bindMethod(queueController.healthCheck));
router.get('/:memberId', bindMethod(queueController.getQueueMember));

// Admin routes (for queue management)
router.put('/:memberId/position', bindMethod(queueController.updateQueuePosition));
router.post('/', bindMethod(queueController.addMemberToQueue));
router.delete('/:memberId', bindMethod(queueController.removeMemberFromQueue));

module.exports = router;
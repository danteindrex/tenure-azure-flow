/**
 * Payout Service - Express Server
 * 
 * Main entry point for the payout service microservice.
 * This file will be implemented in subsequent tasks.
 */

import express from 'express';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(express.json());

// Basic health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Payout Service running on port ${PORT}`);
});

export default app;

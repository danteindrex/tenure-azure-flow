require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const queueRoutes = require('./routes/queueRoutes');
const { apiLimiter } = require('./middleware/rateLimiter');
const database = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3001;

// Detect serverless environment
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.AWS_EXECUTION_ENV;

// Trust proxy for serverless environments (Vercel, AWS Lambda)
// This is required for rate limiting and getting correct client IPs
if (isServerless) {
  app.set('trust proxy', true);
  console.log('🔧 Running in serverless mode - trust proxy enabled');
}

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use(apiLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    service: 'tenure-queue-service',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/queue', queueRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Tenure Queue Service API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      queue: '/api/queue',
      statistics: '/api/queue/statistics',
      member: '/api/queue/:memberId'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  res.status(error.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
  });
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
    const dbTest = await database.testConnection();
    if (!dbTest.success) {
      console.error('Database connection failed:', dbTest.message);
      // Don't exit in serverless - let the platform handle it
      if (!isServerless) {
        process.exit(1);
      } else {
        console.warn('⚠️ Starting server despite database connection failure (serverless mode)');
      }
    } else {
      console.log('✅ Database connection successful');
    }

    app.listen(PORT, () => {
      console.log(`🚀 Tenure Queue Service running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV}`);
      console.log(`🔗 API Base URL: http://localhost:${PORT}`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    // Don't exit in serverless - let the platform handle it
    if (!isServerless) {
      process.exit(1);
    }
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

startServer();

module.exports = app;




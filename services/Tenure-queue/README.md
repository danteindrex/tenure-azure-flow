# Tenure Queue Service

Independent microservice for managing the Tenure Queue functionality, extracted from the main application to operate as a standalone API service.

## Features

- **Queue Management**: Complete queue operations with position tracking
- **Member Statistics**: Real-time statistics and analytics
- **Authentication**: Supabase-based authentication with role-based access
- **Rate Limiting**: Built-in API rate limiting for security
- **Health Monitoring**: Health check endpoints for monitoring
- **CORS Support**: Configurable cross-origin resource sharing

## API Endpoints

### Public Endpoints
- `GET /health` - Service health check
- `GET /` - Service information and available endpoints

### Queue Endpoints (Authentication Required)
- `GET /api/queue` - Get all queue members with optional search and pagination
- `GET /api/queue/statistics` - Get queue statistics
- `GET /api/queue/:memberId` - Get specific queue member
- `GET /api/queue/health` - Database health check

### Admin Endpoints (Admin Role Required)
- `PUT /api/queue/:memberId/position` - Update member queue position
- `POST /api/queue` - Add member to queue
- `DELETE /api/queue/:memberId` - Remove member from queue

## Installation

1. **Install Dependencies**
   ```bash
   cd services/Tenure-queue
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start the Service**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3001 |
| `NODE_ENV` | Environment mode | development |
| `SUPABASE_URL` | Supabase project URL | Required |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | Required |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Required |
| `ALLOWED_ORIGINS` | CORS allowed origins | http://localhost:3000 |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | 900000 |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | 100 |
| `DEFAULT_PAYOUT_THRESHOLD` | Payout threshold amount | 500000 |
| `MAX_WINNERS_PER_PAYOUT` | Maximum winners per payout | 2 |

## Authentication

The service uses Supabase authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## API Usage Examples

### Get Queue Data
```bash
curl -H "Authorization: Bearer <token>" \
     "http://localhost:3001/api/queue?limit=10&offset=0"
```

### Get Statistics
```bash
curl -H "Authorization: Bearer <token>" \
     "http://localhost:3001/api/queue/statistics"
```

### Update Queue Position (Admin)
```bash
curl -X PUT \
     -H "Authorization: Bearer <admin-token>" \
     -H "Content-Type: application/json" \
     -d '{"newPosition": 5}' \
     "http://localhost:3001/api/queue/123/position"
```

## Integration with Main Application

To integrate this microservice with your main application, update the queue API calls to point to this service:

```javascript
// Before (direct database call)
const { data } = await supabase.from('queue').select('*');

// After (microservice call)
const response = await fetch('http://localhost:3001/api/queue', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
const { data } = await response.json();
```

## Monitoring

- Health check: `GET /health`
- Database health: `GET /api/queue/health`
- Service info: `GET /`

## Security Features

- Helmet.js for security headers
- CORS configuration
- Rate limiting
- Input validation
- Authentication middleware
- Admin role verification

## Performance

- Compression middleware
- Efficient database queries
- Pagination support
- Connection pooling via Supabase client

## Development

```bash
# Install dependencies
npm install

# Start development server with auto-reload
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Deployment

The service is containerizable and can be deployed to any Node.js hosting platform. Ensure all environment variables are properly configured in your deployment environment.

## Troubleshooting

1. **Database Connection Issues**: Verify Supabase credentials and network connectivity
2. **Authentication Errors**: Check JWT token validity and user permissions
3. **CORS Issues**: Verify allowed origins configuration
4. **Rate Limiting**: Check if requests exceed configured limits

For more detailed logs, set `NODE_ENV=development` to see full error messages and stack traces.
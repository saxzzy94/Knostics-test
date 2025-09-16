# Knostic CSV Manager - Deployment Guide

## Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for development)
- npm or yarn

## Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Server Configuration
PORT=3001
NODE_ENV=production

# CORS Configuration
CORS_ORIGIN=https://your-production-domain.com

# Security
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX=100

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

## Building the Application

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd knostic
   ```

2. Install dependencies and build:
   ```bash
   npm install
   npm run build
   ```

## Testing

### Running Tests

To run all tests:
```bash
# Run all tests
npm test

# Run tests with coverage report
npm run test:coverage
```

### Test Coverage

After running tests with coverage, you can find the coverage reports in:
- HTML report: `coverage/index.html`
- JSON report: `coverage/coverage-final.json`
- LCOV report: `coverage/lcov.info` (for CI integration)

### Test Coverage Thresholds

- Statement coverage: 80% minimum
- Branch coverage: 70% minimum
- Function coverage: 75% minimum
- Line coverage: 80% minimum

## Docker Deployment

1. Build the Docker image:
   ```bash
   docker build -t knostic-app .
   ```

2. Run the container:
   ```bash
   docker run -d \
     --name knostic \
     -p 3001:3001 \
     --env-file .env \
     -v $(pwd)/logs:/app/server/logs \
     knostic-app
   ```

## Docker Compose

Alternatively, use Docker Compose:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - CORS_ORIGIN=https://your-domain.com
    volumes:
      - ./logs:/app/server/logs
    restart: unless-stopped
```

## Health Check

The application exposes a health check endpoint:

```
GET /api/health
```

## Logs

Logs are stored in the `logs` directory in production. Make sure the directory is writable by the Docker container.

## Monitoring

Consider setting up monitoring for:
- Disk space (for logs)
- Memory usage
- CPU usage
- HTTP status codes
- Error rates

## Backup

Regularly back up any important data stored in the application.

# CashWise Docker Deployment Guide

## Overview
This guide explains how to run CashWise using Docker containers for both frontend and backend.

## Architecture

```
┌─────────────────┐
│   Frontend      │
│   (React)       │
│   Port: 80      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Backend       │
│   (Spring Boot) │
│   Port: 8080    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   PostgreSQL    │
│   Port: 5432    │
└─────────────────┘
```

## Prerequisites

- Docker Desktop installed
- Docker Compose installed
- 4GB RAM minimum
- Ports 80, 8080, 5432 available

## Quick Start

### 1. Clone and Navigate
```bash
cd /path/to/CashWise
```

### 2. Set Environment Variables (Optional)
Create a `.env` file in the root directory:
```env
STRIPE_SECRET_KEY=sk_test_your_actual_stripe_key
```

### 3. Build and Run
```bash
docker-compose up --build
```

### 4. Access the Application
- Frontend: http://localhost
- Backend API: http://localhost:8080
- Database: localhost:5432

## Docker Commands

### Start Services
```bash
# Start all services
docker-compose up

# Start in detached mode (background)
docker-compose up -d

# Build and start
docker-compose up --build
```

### Stop Services
```bash
# Stop all services
docker-compose down

# Stop and remove volumes (deletes database data)
docker-compose down -v
```

### View Logs
```bash
# All services
docker-compose logs

# Specific service
docker-compose logs backend
docker-compose logs frontend
docker-compose logs postgres

# Follow logs (real-time)
docker-compose logs -f backend
```

### Restart Services
```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend
```

### Check Status
```bash
docker-compose ps
```

## Individual Container Commands

### Build Individual Images
```bash
# Backend
cd backend
docker build -t cashwise-backend .

# Frontend
cd frontend
docker build -t cashwise-frontend .
```

### Run Individual Containers
```bash
# Backend (requires database)
docker run -p 8080:8080 \
  -e SPRING_DATASOURCE_URL=jdbc:postgresql://host.docker.internal:5432/cashwise \
  -e SPRING_DATASOURCE_USERNAME=cashwise \
  -e SPRING_DATASOURCE_PASSWORD=cashwise123 \
  cashwise-backend

# Frontend
docker run -p 80:80 cashwise-frontend
```

## Configuration

### Backend Environment Variables
```yaml
SPRING_DATASOURCE_URL: Database connection URL
SPRING_DATASOURCE_USERNAME: Database username
SPRING_DATASOURCE_PASSWORD: Database password
SPRING_JPA_HIBERNATE_DDL_AUTO: update (creates tables automatically)
JWT_SECRET: Secret key for JWT tokens
STRIPE_SECRET_KEY: Your Stripe secret key
```

### Frontend Environment Variables
Set in `frontend/.env.production`:
```env
VITE_API_URL=http://localhost:8080
VITE_STRIPE_PUB_KEY=your_stripe_publishable_key
```

## Database

### Access PostgreSQL
```bash
# Using docker-compose
docker-compose exec postgres psql -U cashwise -d cashwise

# Direct connection
psql -h localhost -p 5432 -U cashwise -d cashwise
```

### Database Credentials
- Host: localhost
- Port: 5432
- Database: cashwise
- Username: cashwise
- Password: cashwise123

### Backup Database
```bash
docker-compose exec postgres pg_dump -U cashwise cashwise > backup.sql
```

### Restore Database
```bash
docker-compose exec -T postgres psql -U cashwise cashwise < backup.sql
```

## Health Checks

### Check Service Health
```bash
# Backend
curl http://localhost:8080/actuator/health

# Frontend
curl http://localhost/health

# Database
docker-compose exec postgres pg_isready -U cashwise
```

### Health Check Endpoints
- Backend: http://localhost:8080/actuator/health
- Frontend: http://localhost/health

## Troubleshooting

### Port Already in Use
```bash
# Check what's using the port
netstat -ano | findstr :8080
netstat -ano | findstr :80

# Kill the process (Windows)
taskkill /PID <process_id> /F
```

### Container Won't Start
```bash
# Check logs
docker-compose logs backend

# Rebuild without cache
docker-compose build --no-cache backend
docker-compose up backend
```

### Database Connection Issues
```bash
# Check if database is ready
docker-compose exec postgres pg_isready

# Restart database
docker-compose restart postgres

# Check database logs
docker-compose logs postgres
```

### Frontend Can't Connect to Backend
1. Check backend is running: `docker-compose ps`
2. Check backend health: `curl http://localhost:8080/actuator/health`
3. Verify VITE_API_URL in frontend/.env.production
4. Rebuild frontend: `docker-compose build frontend`

### Clear Everything and Start Fresh
```bash
# Stop and remove everything
docker-compose down -v

# Remove images
docker rmi cashwise-backend cashwise-frontend

# Rebuild and start
docker-compose up --build
```

## Production Deployment

### Security Considerations
1. Change default database password
2. Use environment variables for secrets
3. Enable HTTPS with reverse proxy (nginx/traefik)
4. Use production Stripe keys
5. Set strong JWT secret

### Example Production docker-compose.yml
```yaml
services:
  backend:
    environment:
      SPRING_DATASOURCE_PASSWORD: ${DB_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY}
    restart: always
```

### Using with Reverse Proxy
```nginx
# nginx configuration
server {
    listen 443 ssl;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:80;
    }

    location /api {
        proxy_pass http://localhost:8080;
    }
}
```

## Performance Optimization

### Resource Limits
Add to docker-compose.yml:
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          memory: 512M
```

### Build Optimization
```bash
# Use BuildKit for faster builds
DOCKER_BUILDKIT=1 docker-compose build
```

## Monitoring

### View Resource Usage
```bash
docker stats
```

### Container Inspection
```bash
# Inspect container
docker inspect cashwise-backend

# View container processes
docker-compose top
```

## Development vs Production

### Development (Current Setup)
- Uses H2 in-memory database (optional)
- Hot reload disabled
- Debug logging enabled
- Test Stripe keys

### Production Recommendations
- Use PostgreSQL (included in docker-compose)
- Enable HTTPS
- Use production Stripe keys
- Set appropriate logging levels
- Use Docker secrets for sensitive data
- Enable monitoring (Prometheus/Grafana)

## Useful Commands Cheat Sheet

```bash
# Start
docker-compose up -d

# Stop
docker-compose down

# Logs
docker-compose logs -f

# Rebuild
docker-compose up --build

# Clean everything
docker-compose down -v && docker system prune -a

# Shell into container
docker-compose exec backend sh
docker-compose exec frontend sh

# Database shell
docker-compose exec postgres psql -U cashwise

# Check health
curl http://localhost:8080/actuator/health
```

## Support

For issues:
1. Check logs: `docker-compose logs`
2. Verify all services are running: `docker-compose ps`
3. Check health endpoints
4. Review environment variables
5. Ensure ports are available

## Next Steps

1. Configure production database
2. Set up SSL/TLS certificates
3. Configure backup strategy
4. Set up monitoring
5. Configure CI/CD pipeline

# CashWise - Personal Finance Manager

A full-stack personal finance web application built with Spring Boot and React.

## Features

- Track income and expenses
- Budget goals and monitoring
- Friend loan management
- Stripe payment integration
- Interactive dashboard with charts
- Category management

## Prerequisites

- Docker Desktop installed and running
- Port 80 and 8080 available (stop XAMPP Apache if running)

## Quick Start

### 1. Start the Application

```bash
docker-compose up -d
```

Wait 1-2 minutes for the backend to fully start.

### 2. Access the Application

- **Frontend**: http://localhost
- **Backend API**: http://localhost:8080
- **H2 Console**: http://localhost:8080/h2-console

### 3. Stop the Application

```bash
docker-compose down
```

## Common Commands

### Start containers (see logs)
```bash
docker-compose up
```

### Rebuild after code changes
```bash
docker-compose up --build -d
```

### View logs
```bash
docker-compose logs -f
```

### View backend logs only
```bash
docker-compose logs -f backend
```

### Check container status
```bash
docker-compose ps
```

### Clean rebuild (if issues occur)
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## First Time Setup

**First build takes 10-15 minutes** (downloads dependencies). Subsequent builds are much faster (30-60 seconds).

## Troubleshooting

### Port 80 already in use
- Stop XAMPP Apache or other services using port 80
- Or change frontend port in `docker-compose.yml`:
  ```yaml
  frontend:
    ports:
      - "3000:80"  # Access at http://localhost:3000
  ```

### Backend not responding
- Wait 1-2 minutes after starting
- Check logs: `docker-compose logs backend`
- Look for: "Started CashwiseApplication"

### CORS errors
- Make sure you rebuilt: `docker-compose up --build -d`
- Clear browser cache (Ctrl+F5)

## Technology Stack

- **Backend**: Spring Boot 4.0.3, Java 17, H2 Database
- **Frontend**: React, Vite, Axios
- **Deployment**: Docker, Nginx
- **Payment**: Stripe API

## Project Structure

```
CashWise/
├── backend/          # Spring Boot API
├── frontend/         # React application
├── docker-compose.yml
└── README.md
```

## Default Test Data

The application creates 12 default categories on first startup:
- Salary, Freelance, Investment (Income)
- Food, Transport, Shopping, Bills, Entertainment, Health, Education, Travel, Other (Expenses)

## Support

For issues or questions, check the logs first:
```bash
docker-compose logs
```

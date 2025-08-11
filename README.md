# System Health Monitor

## Project Overview

The System Health Monitor is a comprehensive full-stack monitoring solution built as an academic project demonstrating modern web development and DevOps practices. This application provides real-time system health metrics collection, storage, visualization, and monitoring capabilities through a microservices architecture.

## Technology Stack

### MERN Stack Implementation
- **MongoDB**: Database for storing system health metrics and time-series data
- **Express.js**: Backend REST API server handling metric ingestion and data retrieval
- **React**: Frontend web application providing interactive dashboards and real-time monitoring
- **Node.js**: Runtime environment for both backend API and data collection agent

### DevOps & Monitoring Tools
- **Docker**: Containerization of all application components
- **Docker Compose**: Multi-container orchestration and service management
- **Jenkins**: CI/CD pipeline automation (with Jenkinsfile-CI configuration)
- **Prometheus**: Metrics collection and time-series database
- **Grafana**: Advanced data visualization and dashboard creation
- **AWS EC2**: Cloud deployment platform

## Architecture

The application follows a microservices architecture with containerized components:

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Frontend  │    │   Backend   │    │   MongoDB   │
│   (React)   │◄──►│ (Express.js)│◄──►│ (Database)  │
│   Port 80   │    │  Port 5000  │    │ Port 27017  │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   ▲                   
       │                   │                   
       ▼                   │                   
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Grafana   │    │    Agent    │    │ Prometheus  │
│ Port 3000   │    │ (Collector) │    │ Port 9090   │
└─────────────┘    └─────────────┘    └─────────────┘
```

### Service Components

1. **Frontend Service** (`frontend/`)
   - React-based web interface
   - Nginx web server serving on port 80
   - Communicates with backend API for data retrieval
   - Environment-configurable backend URL

2. **Backend Service** (`backend/`)
   - Express.js REST API server
   - JWT-based authentication
   - MongoDB integration for data persistence
   - Metrics ingestion endpoint (`/api/metrics`)
   - Serves on port 5000

3. **Agent Service** (`agent/`)
   - System metrics collection daemon
   - Collects CPU, memory, disk, and network statistics
   - Sends data to backend API at regular intervals
   - Configurable hostname and collection frequency

4. **MongoDB**
   - Primary database for metric storage
   - Health check monitoring
   - Persistent data volumes

5. **Prometheus**
   - Time-series metrics collection
   - Custom configuration via `prometheus/prometheus.yml`
   - Web interface for metric exploration

6. **Grafana**
   - Advanced visualization platform
   - Connects to Prometheus for data source
   - Customizable dashboards for system monitoring

## DevOps Integration

### Containerization
All services are containerized using Docker with pre-built images hosted on Docker Hub:
- `bpdeepak49/system-health-monitor-frontend`
- `bpdeepak49/system-health-monitor-backend`
- `bpdeepak49/system-health-monitor-agent`

### CI/CD Pipeline
Jenkins-based automation with `Jenkinsfile-CI` providing:
- Automated builds and testing
- Docker image building and pushing
- Deployment automation
- Environment-specific configurations

### Configuration Management
- Environment variables through `.env` files
- Docker Compose for service orchestration
- Health checks and dependency management
- Persistent volume management for data retention

## Getting Started

### Prerequisites
- Docker and Docker Compose
- Git
- AWS account (for cloud deployment)

### Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/bpdeepak/System-Health-Monitor.git
   cd System-Health-Monitor
   ```

2. **Create environment configuration:**
   ```bash
   # Create .env file with required variables
   echo "IMAGE_TAG=latest" > .env
   echo "HOSTNAME_FOR_AGENT_TAG=local-dev" >> .env
   ```

3. **Start all services:**
   ```bash
   docker compose up -d
   ```

4. **Verify deployment:**
   ```bash
   docker ps
   ```

### Access Points

Once deployed, access the application through:

- **Frontend Dashboard**: `http://localhost` (port 80)
- **Backend API**: `http://localhost:5000`
- **Grafana**: `http://localhost:3000` (admin/admin)
- **Prometheus**: `http://localhost:9090`
- **MongoDB**: `localhost:27017`

## Cloud Deployment

The application is configured for AWS EC2 deployment with:
- Security group configurations for required ports
- Environment-specific backend URLs
- Persistent storage for production data
- Health monitoring and auto-restart policies

Update the `REACT_APP_BACKEND_URL` in docker-compose.yml to your EC2 public IP before deployment.

## Monitoring & Observability

### Metrics Collection
- Real-time system metrics (CPU, memory, disk, network)
- Application performance metrics
- Database health monitoring
- Container resource utilization

### Visualization
- Grafana dashboards for comprehensive monitoring
- Prometheus metrics exploration
- Real-time alerts and notifications
- Historical data analysis

## Development Workflow

The project demonstrates modern DevOps practices:
- **Version Control**: Git-based development with feature branches
- **Containerization**: Docker for consistent environments
- **Orchestration**: Docker Compose for local development
- **CI/CD**: Jenkins pipeline for automated deployments
- **Monitoring**: Integrated observability stack
- **Infrastructure as Code**: Docker Compose configurations

## Configuration

Key configuration files:
- `docker-compose.yml`: Service definitions and networking
- `prometheus/prometheus.yml`: Metrics collection configuration
- `Jenkinsfile-CI`: CI/CD pipeline definition
- Environment variables for deployment-specific settings

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with local Docker environment
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Contact

For questions or issues, please open an issue on GitHub or contact the project maintainer.

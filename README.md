# System Health Monitor

## Project Overview

The System Health Monitor is a full-stack application designed to continuously collect, store, visualize, and alert on system health metrics. It comprises multiple interconnected services orchestrated using Docker Compose, including a Node.js backend, a React frontend, a dedicated agent for metric collection, and integrated monitoring tools (Prometheus and Grafana).

## Features

* **Real-time Metric Collection:** An independent agent collects system metrics (CPU, Memory, Disk, Network) from the host machine.
* **Centralized Data Storage:** Metrics are stored in a MongoDB database via a RESTful API.
* **Interactive Frontend:** A React-based web interface for displaying real-time and historical health data.
* **Robust Monitoring:**
    * **Prometheus:** Collects metrics from the backend and agent (if exposed) for time-series data storage.
    * **Grafana:** Provides powerful visualization dashboards for the collected metrics.
* **Containerized Deployment:** All services are containerized using Docker and orchestrated with Docker Compose for easy setup and scaling.
* **Scalable Architecture:** Designed with modular components that can be scaled independently.

## Architecture

The project is built upon a microservices architecture, orchestrated by Docker Compose:

* **`mongo`**: The MongoDB database, used by the `backend` service to store system health metrics.
* **`backend`**: A Node.js (Express.js) application that exposes a REST API for metric ingestion from the `agent` and data retrieval by the `frontend`. It interacts directly with MongoDB.
* **`frontend`**: A React application that provides the user interface. It communicates with the `backend` API to fetch and display health data.
* **`agent`**: A dedicated service (likely Node.js or Python-based) that runs on the monitored host, collects system metrics, and sends them to the `backend` API at regular intervals.
* **`prometheus`**: A monitoring system that c## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing, or deploy it to an AWS EC2 instance.

### Prerequisites

* **Docker:** [Install Docker](https://docs.docker.com/get-docker/)
* **Docker Compose:** [Install Docker Compose](https://docs.docker.com/compose/install/) (usually comes with Docker Desktop)
* **AWS Account (for EC2 deployment):** If deploying to the cloud.

### Local Development Setup

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/bpdeepak49/system-health-monitor.git](https://github.com/bpdeepak49/system-health-monitor.git)
    cd system-health-monitor
    ```

2.  **Create a `.env` file:**
    Create a file named `.env` in the root directory of the project and add the following environment variables. Replace placeholders with your actual values.

    ```
    # Docker Hub User (for pulling your images)
    DOCKERHUB_USER=bpdeepak49

    # Image Tag (e.g., 'latest' or a specific version)
    IMAGE_TAG=latest

    # Hostname for Agent (e.g., 'my-local-machine')
    HOSTNAME_FOR_AGENT_TAG=local-dev

    # JWT Secret for Backend (use a strong, random string)
    JWT_SECRET=your_jwt_secret_here_replace_with_a_long_random_string_for_security

    # Frontend Backend URL (for local dev, use localhost or 127.0.0.1)
    # The port 5000 is exposed by the backend
    REACT_APP_BACKEND_URL=http://localhost:5000
    ```
    **Note:** For `JWT_SECRET`, ensure it's a long, random, and complex string.

3.  **Run Docker Compose:**
    ```bash
    docker compose up -d --build
    ```
    The `--build` flag ensures your images are rebuilt if there are local changes. `-d` runs the containers in detached mode.

4.  **Verify services:**
    ```bash
    docker ps
    ```
    All containers (`mongodb_monitoring`, `backend_monitoring`, `frontend_monitoring`, `agent_monitoring`, `prometheus`, `grafana`) should be in an `Up` state, and `mongodb_monitoring` should show `(healthy)` after a short while.

### AWS EC2 Deployment

This section assumes you have an AWS account and have configured your AWS CLI or can access the AWS Management Console.

1.  **Launch an EC2 Instance:**
    * **AMI:** Choose a recent Ubuntu Server AMI (e.g., Ubuntu Server 22.04 LTS or 24.04 LTS).
    * **Instance Type:** `t3.medium` or larger is recommended for all services, especially with Prometheus/Grafana. `t3.micro` might be sufficient for light testing but could run into resource limitations.
    * **Key Pair:** Use an existing key pair or create a new one. This `.pem` file will be needed for SSH.
    * **Network Settings (Security Group):**
        * **SSH (Port 22):** Allow traffic from "My IP" or `0.0.0.0/0` (less secure, but quick for testing).
        * **HTTP (Port 80):** Allow traffic from `0.0.0.0/0` (for frontend access).
        * **Backend API (Port 5000):** Allow traffic from `0.0.0.0/0` (for frontend and agent communication).
        * **Grafana (Port 3000):** Allow traffic from `0.0.0.0/0` (for Grafana UI).
        * **Prometheus (Port 9090):** Allow traffic from `0.0.0.0/0` (for Prometheus UI).
        * **MongoDB (Port 27017):** **ONLY** allow traffic from the Security Group ID of the EC2 instance itself (for inter-container communication if needed for external tools like Compass, but typically not exposed to the internet directly). If you connect from your local machine with MongoDB Compass, allow your IP.
    * **Storage:** Ensure enough disk space (e.g., 20-30GB) for Docker images, logs, and MongoDB/Prometheus data.

2.  **SSH into your EC2 Instance:**
    ```bash
    ssh -i /path/to/your-key-pair.pem ubuntu@YOUR_EC2_PUBLIC_IP
    ```

3.  **Install Docker and Docker Compose on EC2:**
    ```bash
    sudo apt update
    sudo apt install docker.io -y
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -aG docker ubuntu # Add current user to docker group
    # Log out and log back in for group changes to take effect: exit, then ssh again
    sudo apt install docker-compose -y # Or install Docker Compose Plugin if newer Docker:
    # sudo apt install docker-compose-plugin -y
    ```
    *(Note: For newer Docker versions, `docker compose` (with a space) is the command for the plugin, instead of `docker-compose` (with a hyphen). Your `docker-compose.yml` is compatible with both).*

4.  **Clone the repository on EC2:**
    ```bash
    git clone [https://github.com/bpdeepak49/system-health-monitor.git](https://github.com/bpdeepak49/system-health-monitor.git)
    cd system-health-monitor
    ```

5.  **Create a `.env` file:**
    Create a file named `.env` in the `system-health-monitor` directory.
    ```bash
    nano .env
    ```
    Add the following content. **Crucially, replace `YOUR_EC2_PUBLIC_IP` with your actual EC2 instance's public IP address or DNS name.**

    ```
    # Docker Hub User (for pulling your images)
    DOCKERHUB_USER=bpdeepak49

    # Image Tag (e.g., 'latest' or a specific version)
    IMAGE_TAG=latest

    # Hostname for Agent (e.g., 'your-ec2-instance')
    HOSTNAME_FOR_AGENT_TAG=ec2-instance-1

    # JWT Secret for Backend (use a strong, random string)
    JWT_SECRET=your_jwt_secret_here_replace_with_a_long_random_string_for_security

    # Frontend Backend URL (for EC2 deployment, use your EC2's public IP)
    REACT_APP_BACKEND_URL=http://YOUR_EC2_PUBLIC_IP:5000
    ```
    Save and exit (`Ctrl+O`, Enter, `Ctrl+X` in nano).

6.  **Run Docker Compose:**
    ```bash
    docker compose up -d --build
    ```
    This will pull the necessary images (or build them if not found locally), create volumes, and start all services.

7.  **Verify services:**
    ```bash
    docker ps
    ```
    Ensure all containers are `Up`. The `mongodb_monitoring` container should eventually transition to `(healthy)`.

## Usage

Once all services are up and running:

* **System Health Monitor Frontend:**
    * Access in your web browser: `http://YOUR_EC2_PUBLIC_IP` (or `http://localhost` if running locally).
* **Grafana Dashboard:**
    * Access in your web browser: `http://YOUR_EC2_PUBLIC_IP:3000` (or `http://localhost:3000`).
    * Default login: `admin`/`admin` (you will be prompted to change this on first login).
    * You may need to add Prometheus as a data source in Grafana (connect to `http://prometheus:9090` from Grafana's network context) and import relevant dashboards.
* **Prometheus UI:**
    * Access in your web browser: `http://YOUR_EC2_PUBLIC_IP:9090` (or `http://localhost:9090`).
    * You can explore collected metrics here.

## Configuration

* **`docker-compose.yml`**: Defines all services, their dependencies, exposed ports, and volumes.
* **`.env` file**: Contains environment variables for image tags, backend URLs, and secrets. **Crucial for deployment.**
* **`prometheus/prometheus.yml`**: The configuration file for Prometheus, defining scrape targets (e.g., `backend` and `agent` services if they expose metrics). Adjust `scrape_configs` as needed.

## Troubleshooting

* **`ssh: connect to host ... Connection timed out`**:
    * Check your EC2 instance state in the AWS console (must be `running`).
    * Verify your EC2 instance's Security Group allows inbound SSH (port 22) from your IP.
    * Check EC2 instance status checks (`2/2 checks passed`).
* **`Host key verification failed.`**:
    * This typically happens when your EC2 instance's public IP changes (e.g., after a stop/start).
    * If using Jenkins or a CI/CD tool, ensure your SSH commands (`ssh`, `scp`) include `-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null`.
* **`mongodb_monitoring is unhealthy` or `WAITING` for a long time**:
    * Check `docker logs mongodb_monitoring`.
    * Ensure the `healthcheck` in `docker-compose.yml` for the `mongo` service uses `mongo` and not `mongosh` (e.g., `test: echo 'db.runCommand("ping").ok' | mongo --port 27017 --quiet`). `mongosh` is not included in the default `mongo:latest` image.
    * Consider removing `mongodb_data` volume (WARNING: deletes data) and restarting if you suspect data corruption or permission issues: `docker compose down --volumes` then `docker compose up -d`.
* **Backend/Frontend not connecting to MongoDB/Backend**:
    * Ensure the `MONGO_URI` in `backend` and `REACT_APP_BACKEND_URL` in `frontend` environment variables are correct within the `docker-compose.yml` and `.env` file respectively.
    * For inter-container communication (e.g., `backend` to `mongo`), use service names (`mongodb://mongo:27017`).
    * For external access (e.g., browser to `frontend`, `frontend` to `backend`), use the EC2 Public IP.
    * Check Security Group rules for ports 5000, 80, 27017.
* **`docker compose up -d` issues**:
    * Check `docker logs <container_name>` for any failing containers.
    * Ensure enough disk space on your EC2 instance (`df -h`).
    * Verify correct Docker and Docker Compose installation.

## Contributing

Contributions are welcome! Please follow these steps:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature-name`).
3.  Make your changes.
4.  Commit your changes (`git commit -m 'Add new feature'`).
5.  Push to the branch (`git push origin feature/your-feature-name`).
6.  Open a Pull Request.

## License

This project is licensed under the MIT License - see the `LICENSE` file for details. (You might want to create a `LICENSE` file in your repo if you don't have one).

## Contact

For any questions or issues, please open an issue on the GitHub repository or contact [Your Name/Email/GitHub Profile].ollects and stores time-series metrics from various sources. It's configured to scrape metrics from the `backend` and `agent` (if they expose Prometheus endpoints).
* **`grafana`**: A powerful open-source platform for analytics and interactive visualization. It's connected to Prometheus to query and display dashboards based on collected metrics.


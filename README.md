# AlfaVox DevOps Workflow

This repository contains the DevOps setup for the AlfaVox portfolio website.

## Project Structure

- `backend/`: Firebase hosting configuration and static files
- `Dockerfile`: Docker configuration for containerizing the static site
- `Jenkinsfile`: CI/CD pipeline configuration
- `k8s-deployment.yaml`: Kubernetes deployment manifests
- `terraform/`: Infrastructure as Code using Terraform
- `ansible/`: Ansible playbooks for automation tasks

## DevOps Workflow

### 1. Version Control & Collaboration

- Use Git with feature branches for changes
- Create pull requests for code reviews
- Follow conventional commit messages

### 2. CI/CD Pipeline

The Jenkins pipeline includes:
- **Build**: Build Docker image
- **Test**: Basic health check of the container
- **Deploy**: Deploy to Kubernetes cluster

### 3. Containerization

The application is containerized using Docker with Nginx to serve static files.

### 4. Orchestration

Deployed to Kubernetes with:
- Deployment with 3 replicas
- Service with LoadBalancer
- Health checks and resource limits

### 5. Infrastructure as Code

Infrastructure is defined using Terraform:
- VPC and subnets
- EKS cluster
- Security groups
- IAM roles

## Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd AlfaVox-Devops-Workflow
   ```

2. **Set up infrastructure**
   ```bash
   cd terraform
   terraform init
   terraform plan
   terraform apply
   ```

3. **Configure Jenkins**
   - Install Docker and Kubernetes plugins
   - Add Docker Hub credentials
   - Add Kubernetes config

4. **Deploy**
   - Push changes to trigger Jenkins pipeline
   - Monitor deployment in Kubernetes

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make changes and commit: `git commit -m "feat: add your feature"`
3. Push and create PR: `git push origin feature/your-feature`

## Monitoring

- Check pod status: `kubectl get pods`
- View logs: `kubectl logs <pod-name>`
- Check service: `kubectl get svc`

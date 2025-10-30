# Ansible Playbooks for AlfaVox DevOps Workflow

This directory contains Ansible playbooks to automate various DevOps tasks for the AlfaVox project.

## Playbooks

### 1. playbook-setup-cicd.yml
Sets up the CI/CD environment by installing and configuring:
- Docker
- Jenkins
- kubectl
- AWS CLI

Run with:
```bash
ansible-playbook playbook-setup-cicd.yml
```

### 2. playbook-deploy-app.yml
Deploys the application to Kubernetes using the existing k8s-deployment.yaml.

Run with:
```bash
ansible-playbook playbook-deploy-app.yml
```

## Configuration

- `ansible.cfg`: Ansible configuration file
- `inventory.ini`: Inventory file for defining hosts

## Prerequisites

- Ansible installed on the control machine
- SSH access to target servers (if deploying remotely)
- Appropriate permissions for package installation and service management

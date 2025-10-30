terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.85.0"
    }
  }
}

provider "google" {
  project = "alfa-vox-portfolio"
  region  = "us-central1"
}

# GKE Cluster with e2-standard-4 nodes
resource "google_container_cluster" "alfavox_cluster" {
  name               = "alfavox-cluster"
  location           = "us-central1-a"  # Single zone for cost efficiency
  initial_node_count = 1                # Start with 1 node
  
  # Use default network
  network    = "default"
  subnetwork = "default"

  # Use default node pool
  remove_default_node_pool = false

  # Disable unnecessary features to save resources
  enable_shielded_nodes = false
  enable_intranode_visibility = false
  enable_kubernetes_alpha = false
  
  # Let GKE auto-assign IP ranges
  # Remove ip_allocation_policy to use defaults

  # Node configuration with e2-standard-4
  node_config {
    machine_type = "e2-standard-4"  # 4 vCPUs, 16GB RAM
    disk_size_gb = 50               # Larger disk for stability
    preemptible  = false            # More stable for production
    
    # Essential scopes
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]

    # Labels for better resource management
    labels = {
      environment = "production"
      workload    = "backend"
    }

    # Taints/tolerations if needed
    taint = []
  }

  # Cluster autoscaling for better resource management
  cluster_autoscaling {
    enabled = true
    resource_limits {
      resource_type = "cpu"
      minimum = 1
      maximum = 4
    }
    resource_limits {
      resource_type = "memory"
      minimum = 4
      maximum = 16
    }
  }

  # Vertical Pod Autoscaling (recommended)
  vertical_pod_autoscaling {
    enabled = true
  }
}

# Outputs
output "gke_cluster_name" {
  description = "GKE Cluster Name"
  value       = google_container_cluster.alfavox_cluster.name
}

output "gke_cluster_endpoint" {
  description = "GKE Cluster Endpoint"
  value       = google_container_cluster.alfavox_cluster.endpoint
}

output "gke_cluster_region" {
  description = "GKE Cluster Region"
  value       = google_container_cluster.alfavox_cluster.location
}
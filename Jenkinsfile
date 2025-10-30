pipeline {
    agent any
    
    environment {
        DOCKER_REGISTRY = 'docker.io'
        IMAGE_NAME = 'your-dockerhub-username/aifa-backend'
        GKE_CLUSTER = 'aifa-cluster'
        GKE_ZONE = 'us-central1'
    }
    
    stages {
        stage('Test') {
            steps {
                sh 'npm install'
                sh 'npm test'
            }
        }
        
        stage('Build') {
            steps {
                script {
                    docker.build("${IMAGE_NAME}:${env.BUILD_ID}")
                }
            }
        }
        
        stage('Push') {
            steps {
                script {
                    docker.withRegistry("https://${DOCKER_REGISTRY}", 'dockerhub-credentials') {
                        docker.image("${IMAGE_NAME}:${env.BUILD_ID}").push()
                        docker.image("${IMAGE_NAME}:latest").push()
                    }
                }
            }
        }
        
        stage('Terraform Apply') {
            steps {
                dir('terraform') {
                    sh 'terraform init'
                    sh 'terraform apply -auto-approve'
                }
            }
        }
        
        stage('Deploy to GKE') {
            steps {
                script {
                    withCredentials([file(credentialsId: 'gcp-key', variable: 'GCP_KEY')]) {
                        sh "gcloud auth activate-service-account --key-file=${GCP_KEY}"
                        sh "gcloud container clusters get-credentials ${GKE_CLUSTER} --zone ${GKE_ZONE} --project ${GCP_PROJECT}"
                        sh "kubectl set image deployment/aifa-backend aifa-backend=${IMAGE_NAME}:${env.BUILD_ID}"
                        sh "kubectl rollout status deployment/aifa-backend"
                    }
                }
            }
        }
    }
}
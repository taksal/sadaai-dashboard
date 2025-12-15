#!/bin/bash

# GCP Deployment Script for Call Analytics Platform
# Optimized for Cloud Run deployment

set -e  # Exit on error

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
PROJECT_ID="sada-platform"
REGION="australia-southeast1"
BACKEND_SERVICE="backend"
FRONTEND_SERVICE="frontend"
ARTIFACT_REGISTRY="sada"

print_message() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check prerequisites
if ! command -v gcloud &> /dev/null; then
    print_error "gcloud CLI not installed. Install from https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Set project
print_message "Setting GCP project to $PROJECT_ID..."
gcloud config set project $PROJECT_ID

# Configure Docker auth
print_message "Configuring Docker authentication..."
gcloud auth configure-docker ${REGION}-docker.pkg.dev

# Build backend
print_message "Building backend Docker image..."
cd backend
docker build -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REGISTRY}/backend:latest .
print_message "Pushing backend image..."
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REGISTRY}/backend:latest
cd ..

# Deploy backend
print_message "Deploying backend to Cloud Run..."
gcloud run deploy ${BACKEND_SERVICE} \
    --image=${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REGISTRY}/backend:latest \
    --region=${REGION} \
    --platform=managed \
    --allow-unauthenticated \
    --min-instances=0 \
    --max-instances=10 \
    --memory=512Mi \
    --cpu=1 \
    --port=8080 \
    --vpc-connector=sada-vpc \
    --set-cloudsql-instances=${PROJECT_ID}:${REGION}:sada-db \
    --update-secrets=DATABASE_URL=DATABASE_URL:latest,JWT_SECRET=JWT_SECRET:latest,JWT_REFRESH_SECRET=JWT_REFRESH_SECRET:latest,REDIS_HOST=REDIS_HOST:latest \
    --update-env-vars=NODE_ENV=production

# Get backend URL
BACKEND_URL=$(gcloud run services describe ${BACKEND_SERVICE} --region=${REGION} --format='value(status.url)')
print_message "Backend deployed at: $BACKEND_URL"

# Build frontend with backend URL
print_message "Building frontend Docker image..."
cd frontend
docker build \
    --build-arg NEXT_PUBLIC_API_URL=${BACKEND_URL}/api \
    -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REGISTRY}/frontend:latest .
print_message "Pushing frontend image..."
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REGISTRY}/frontend:latest
cd ..

# Deploy frontend
print_message "Deploying frontend to Cloud Run..."
gcloud run deploy ${FRONTEND_SERVICE} \
    --image=${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REGISTRY}/frontend:latest \
    --region=${REGION} \
    --platform=managed \
    --allow-unauthenticated \
    --min-instances=0 \
    --max-instances=10 \
    --memory=512Mi \
    --cpu=1 \
    --port=3000 \
    --update-secrets=NEXTAUTH_SECRET=NEXTAUTH_SECRET:latest \
    --update-env-vars=NODE_ENV=production,NEXT_PUBLIC_API_URL=${BACKEND_URL}/api

# Get frontend URL
FRONTEND_URL=$(gcloud run services describe ${FRONTEND_SERVICE} --region=${REGION} --format='value(status.url)')
print_message "Frontend deployed at: $FRONTEND_URL"

# Summary
echo ""
print_message "========================================="
print_message "Deployment completed successfully!"
print_message "========================================="
print_message "Backend:  $BACKEND_URL"
print_message "Frontend: $FRONTEND_URL"
print_message "========================================="
echo ""
print_warning "Next steps:"
echo "1. Test backend health: curl ${BACKEND_URL}/api/health"
echo "2. Open frontend in browser: ${FRONTEND_URL}"
echo "3. Update backend CORS to allow: ${FRONTEND_URL}"

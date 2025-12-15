# GCP Deployment Guide - Call Analytics Platform

## Prerequisites

- GCP Project with billing enabled
- Organization Admin role (for IAM policies)
- Cloud SQL PostgreSQL instance
- Cloud Memorystore Redis instance
- VPC with Cloud SQL connector

## Project Information

```bash
PROJECT_ID="sada-platform"
REGION="australia-southeast1"
ORG_ID="731977473841"  # Get via: gcloud organizations list

# Database
DB_INSTANCE="sada-db"
DB_NAME="call_analytics"
DB_USER="dbuser"
DB_PASSWORD="<your-password>"

# Services
BACKEND_SERVICE="backend"
FRONTEND_SERVICE="frontend"
```

## 1. Setup Infrastructure (One-Time)

### Enable Required APIs

```bash
gcloud services enable run.googleapis.com \
  sqladmin.googleapis.com \
  vpcaccess.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com \
  orgpolicy.googleapis.com \
  --project=$PROJECT_ID
```

### Create Database Connection String Secret

```bash
# Format: postgresql://USER:URL_ENCODED_PASSWORD@localhost/DB_NAME?host=/cloudsql/PROJECT:REGION:INSTANCE
# URL encode special characters: + → %2B, / → %2F, = → %3D

echo -n "postgresql://dbuser:<URL_ENCODED_PASSWORD>@localhost/call_analytics?host=/cloudsql/sada-platform:australia-southeast1:sada-db" | \
  gcloud secrets create DATABASE_URL --data-file=- --project=$PROJECT_ID
```

### Create Other Required Secrets

```bash
echo -n "your-jwt-secret-here" | gcloud secrets create JWT_SECRET --data-file=- --project=$PROJECT_ID
echo -n "your-vapi-key" | gcloud secrets create VAPI_API_KEY --data-file=- --project=$PROJECT_ID
echo -n "redis-host-ip" | gcloud secrets create REDIS_HOST --data-file=- --project=$PROJECT_ID
```

## 2. Update Application Files

### backend/Dockerfile

Key changes:
- Use `npm install --legacy-peer-deps` (line 12, 43)
- Add OpenSSL for Prisma: `apk add --no-cache dumb-init` (line 32)
- CMD: `node dist/main.js` (line 67) - NestJS builds to dist/main.js with proper config
- Port: 8080 (Cloud Run standard)

### backend/prisma/schema.prisma

```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
}
```

### frontend/Dockerfile

Key change:
- Use `npm install --legacy-peer-deps` (line 11) for React 19 compatibility

## 3. Deploy Services

### Deploy Backend

```bash
cd backend
chmod +x deploy-cloud-build.sh
./deploy-cloud-build.sh
```

**Or manually:**

```bash
gcloud run deploy backend \
  --source . \
  --region=$REGION \
  --platform=managed \
  --set-env-vars="NODE_ENV=production" \
  --set-secrets="DATABASE_URL=DATABASE_URL:latest,JWT_SECRET=JWT_SECRET:latest,VAPI_API_KEY=VAPI_API_KEY:latest,REDIS_HOST=REDIS_HOST:latest" \
  --add-cloudsql-instances="sada-platform:australia-southeast1:sada-db" \
  --vpc-connector=sada-vpc-connector \
  --min-instances=0 \
  --max-instances=10 \
  --memory=512Mi \
  --cpu=1 \
  --timeout=300 \
  --project=$PROJECT_ID
```

### Deploy Frontend

```bash
cd frontend

gcloud run deploy frontend \
  --source . \
  --region=$REGION \
  --platform=managed \
  --set-env-vars="NEXT_PUBLIC_API_URL=https://backend-ibpnxtvr7a-ts.a.run.app" \
  --min-instances=0 \
  --max-instances=5 \
  --memory=512Mi \
  --cpu=1 \
  --project=$PROJECT_ID
```

## 4. Enable Public Access

### Grant Yourself Organization Policy Admin (One-Time)

```bash
gcloud organizations add-iam-policy-binding $ORG_ID \
  --member="user:your-email@domain.com" \
  --role="roles/orgpolicy.policyAdmin"
```

### Reset IAM Policy Restriction

```bash
# Enable API
gcloud services enable orgpolicy.googleapis.com --project=$PROJECT_ID

# Reset the restrictive policy
gcloud org-policies reset iam.allowedPolicyMemberDomains --organization=$ORG_ID

# Verify reset
gcloud org-policies describe iam.allowedPolicyMemberDomains --organization=$ORG_ID
```

### Add Public Access to Services

```bash
gcloud run services add-iam-policy-binding backend \
  --region=$REGION \
  --member="allUsers" \
  --role="roles/run.invoker" \
  --project=$PROJECT_ID

gcloud run services add-iam-policy-binding frontend \
  --region=$REGION \
  --member="allUsers" \
  --role="roles/run.invoker" \
  --project=$PROJECT_ID
```

## 5. Verify Deployment

```bash
# Get service URLs
gcloud run services list --region=$REGION --project=$PROJECT_ID

# Test backend health
curl -I https://backend-<hash>.run.app/api/health

# Test frontend
curl -I https://frontend-<hash>.run.app
```

## Common Issues & Fixes

### Issue: "invalid port number in database URL"
**Fix:** Ensure DATABASE_URL uses correct format with URL-encoded password:
```
postgresql://dbuser:encoded_password@localhost/call_analytics?host=/cloudsql/PROJECT:REGION:INSTANCE
```

### Issue: "Prisma binary not found"
**Fix:** Add to schema.prisma:
```prisma
binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
```

### Issue: "403 Forbidden" on services
**Fix:** Reset organization policy and add allUsers IAM binding (see Step 4)

### Issue: "npm install fails with peer dependency errors"
**Fix:** Use `--legacy-peer-deps` flag in both Dockerfiles

### Issue: Container fails to start - "dist/main.js not found"
**Fix:** Check nest-cli.json has correct sourceRoot and Dockerfile CMD matches build output

## Re-Deployment (After Initial Setup)

Once infrastructure is set up, redeploy with:

```bash
# Backend
cd backend
./deploy-cloud-build.sh

# Frontend (update API URL if backend URL changed)
cd frontend
gcloud run deploy frontend \
  --source . \
  --region=$REGION \
  --project=$PROJECT_ID
```

No need to repeat IAM policy or secrets setup unless they changed.

## Service URLs

- Backend: https://backend-ibpnxtvr7a-ts.a.run.app
- Frontend: https://frontend-458486271344.australia-southeast1.run.app

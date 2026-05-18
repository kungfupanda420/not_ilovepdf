# Azure Container Apps Deployment Guide

This guide provides step-by-step instructions to deploy your Next.js application and Gotenberg service to Azure Container Apps.

## Prerequisites

Before you begin, ensure you have:

1. **Azure CLI** installed ([Download](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli))
2. **Docker** installed and running
3. An **Azure Subscription** with sufficient permissions to create resources
4. Your application code built and ready

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Azure Container Apps Environment            │
│                                                                 │
│  ┌──────────────────────────┐      ┌──────────────────────┐   │
│  │   Next.js Web App        │      │   Gotenberg Service  │   │
│  │  (Public Ingress)        │      │  (Internal Only)     │   │
│  │  - Port: 3000            │      │  - Port: 3000        │   │
│  │  - Public URL            │      │  - Private FQDN      │   │
│  │                          │      │                      │   │
│  │  GOTENBERG_URL env var   │──────│  http://gotenberg   │   │
│  │  Points to internal FQDN │      │  .internal           │   │
│  └──────────────────────────┘      └──────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Step 1: Set Up Environment Variables

```bash
# Set these variables based on your setup
export AZURE_RESOURCE_GROUP="myapp-rg"
export AZURE_REGION="eastus"
export AZURE_CONTAINER_REGISTRY="myappcr"
export AZURE_CONTAINER_APPS_ENV="myapp-env"
export AZURE_SUBSCRIPTION_ID="YOUR_SUBSCRIPTION_ID"

# For your container image names
export NEXTJS_IMAGE_NAME="nextjs-app"
export NEXTJS_IMAGE_TAG="latest"
```

## Step 2: Create Azure Resource Group

```bash
az group create \
  --name $AZURE_RESOURCE_GROUP \
  --location $AZURE_REGION
```

**Example output:**
```
{
  "id": "/subscriptions/...",
  "location": "eastus",
  "managedBy": null,
  "name": "myapp-rg",
  "properties": {
    "provisioningState": "Succeeded"
  },
  "tags": {}
}
```

## Step 3: Create Azure Container Registry (ACR)

```bash
az acr create \
  --resource-group $AZURE_RESOURCE_GROUP \
  --name $AZURE_CONTAINER_REGISTRY \
  --sku Basic
```

**Note:** The SKU can be `Basic`, `Standard`, or `Premium`. Use `Basic` for development.

## Step 4: Enable Admin Access to ACR (for authentication)

```bash
az acr update \
  --name $AZURE_CONTAINER_REGISTRY \
  --admin-enabled true
```

Get the login credentials:

```bash
az acr credential show \
  --name $AZURE_CONTAINER_REGISTRY \
  --query "passwords[0].value" \
  --output tsv
```

Store the ACR password securely for later use.

## Step 5: Build and Push Next.js Image to ACR

### Option A: Using ACR Build (Recommended - builds in Azure)

```bash
az acr build \
  --registry $AZURE_CONTAINER_REGISTRY \
  --image $NEXTJS_IMAGE_NAME:$NEXTJS_IMAGE_TAG \
  --file Dockerfile .
```

This command will:
- Upload your source code to ACR
- Build the Docker image in Azure
- Store the image in your registry

### Option B: Build Locally and Push to ACR

If you prefer to build locally:

```bash
# Get ACR login server name
ACR_LOGIN_SERVER=$(az acr show \
  --name $AZURE_CONTAINER_REGISTRY \
  --query loginServer \
  --output tsv)

# Login to ACR
az acr login --name $AZURE_CONTAINER_REGISTRY

# Build Docker image locally
docker build -t $ACR_LOGIN_SERVER/$NEXTJS_IMAGE_NAME:$NEXTJS_IMAGE_TAG .

# Push to ACR
docker push $ACR_LOGIN_SERVER/$NEXTJS_IMAGE_NAME:$NEXTJS_IMAGE_TAG
```

## Step 6: Create Container Apps Environment

```bash
az containerapp env create \
  --name $AZURE_CONTAINER_APPS_ENV \
  --resource-group $AZURE_RESOURCE_GROUP \
  --location $AZURE_REGION
```

This creates the managed environment where your containers will run.

## Step 7: Deploy Gotenberg Service (Internal)

Deploy Gotenberg as an internal service with no public ingress:

```bash
az containerapp create \
  --name gotenberg \
  --resource-group $AZURE_RESOURCE_GROUP \
  --environment $AZURE_CONTAINER_APPS_ENV \
  --image gotenberg/gotenberg:8 \
  --target-port 3000 \
  --cpu 2.0 \
  --memory 2.0Gi \
  --ingress internal \
  --query properties.configuration.ingress.fqdn \
  --output tsv
```

**Important:** Save the returned FQDN. It will look like:
```
gotenberg.internal.azurecontainerapps.io
```

This FQDN is used by the Next.js app to communicate with Gotenberg.

## Step 8: Deploy Next.js Application (Public)

Deploy the Next.js app with public ingress:

```bash
# Get the ACR login server
ACR_LOGIN_SERVER=$(az acr show \
  --name $AZURE_CONTAINER_REGISTRY \
  --query loginServer \
  --output tsv)

# Deploy Next.js app
az containerapp create \
  --name nextjs-app \
  --resource-group $AZURE_RESOURCE_GROUP \
  --environment $AZURE_CONTAINER_APPS_ENV \
  --image $ACR_LOGIN_SERVER/$NEXTJS_IMAGE_NAME:$NEXTJS_IMAGE_TAG \
  --target-port 3000 \
  --ingress external \
  --cpu 1.0 \
  --memory 1.0Gi \
  --registry-login-server $ACR_LOGIN_SERVER \
  --registry-username $(az acr credential show --name $AZURE_CONTAINER_REGISTRY --query "username" --output tsv) \
  --registry-password $(az acr credential show --name $AZURE_CONTAINER_REGISTRY --query "passwords[0].value" --output tsv) \
  --env-vars \
    GOTENBERG_URL="http://gotenberg.internal.azurecontainerapps.io" \
    NODE_ENV="production" \
  --query properties.configuration.ingress.fqdn \
  --output tsv
```

**Replace `gotenberg.internal.azurecontainerapps.io` with the actual FQDN from Step 7.**

This will return your public URL, e.g.:
```
nextjs-app.region.azurecontainerapps.io
```

## Step 9: Verify Deployment

### Check Container Apps Status

```bash
# List all container apps in the environment
az containerapp list \
  --resource-group $AZURE_RESOURCE_GROUP \
  --output table

# Get detailed info about Next.js app
az containerapp show \
  --name nextjs-app \
  --resource-group $AZURE_RESOURCE_GROUP \
  --query "{ name: name, state: properties.provisioningState, fqdn: properties.configuration.ingress.fqdn }"

# Get detailed info about Gotenberg app
az containerapp show \
  --name gotenberg \
  --resource-group $AZURE_RESOURCE_GROUP \
  --query "{ name: name, state: properties.provisioningState, internalFqdn: properties.configuration.ingress.fqdn }"
```

### View Logs

```bash
# View Next.js app logs
az containerapp logs show \
  --name nextjs-app \
  --resource-group $AZURE_RESOURCE_GROUP

# View Gotenberg logs
az containerapp logs show \
  --name gotenberg \
  --resource-group $AZURE_RESOURCE_GROUP
```

### Test the Deployment

```bash
# Get the public URL
NEXTJS_PUBLIC_URL=$(az containerapp show \
  --name nextjs-app \
  --resource-group $AZURE_RESOURCE_GROUP \
  --query properties.configuration.ingress.fqdn \
  --output tsv)

# Test the main endpoint
curl https://$NEXTJS_PUBLIC_URL

# Test your API endpoint (replace with your actual endpoint)
curl https://$NEXTJS_PUBLIC_URL/api/convert
```

## Step 10: Update Environment Variables (After Deployment)

If you need to update the `GOTENBERG_URL` or other environment variables:

```bash
az containerapp update \
  --name nextjs-app \
  --resource-group $AZURE_RESOURCE_GROUP \
  --set-env-vars \
    GOTENBERG_URL="http://gotenberg.internal.azurecontainerapps.io" \
    NODE_ENV="production"
```

## Step 11: Scale Your Containers (Optional)

Adjust CPU and memory based on your needs:

```bash
# Scale Next.js app
az containerapp update \
  --name nextjs-app \
  --resource-group $AZURE_RESOURCE_GROUP \
  --cpu 2.0 \
  --memory 2.0Gi

# Scale Gotenberg
az containerapp update \
  --name gotenberg \
  --resource-group $AZURE_RESOURCE_GROUP \
  --cpu 2.0 \
  --memory 2.0Gi
```

## Step 12: Set Up Auto-Scaling (Optional)

```bash
# Enable auto-scaling for Next.js app
az containerapp update \
  --name nextjs-app \
  --resource-group $AZURE_RESOURCE_GROUP \
  --min-replicas 1 \
  --max-replicas 3

# Enable auto-scaling for Gotenberg
az containerapp update \
  --name gotenberg \
  --resource-group $AZURE_RESOURCE_GROUP \
  --min-replicas 1 \
  --max-replicas 3
```

## Cleanup

To delete all resources and avoid charges:

```bash
# Delete the entire resource group (deletes everything)
az group delete \
  --name $AZURE_RESOURCE_GROUP \
  --yes
```

## Troubleshooting

### Issue: Container fails to start

1. Check logs:
   ```bash
   az containerapp logs show --name nextjs-app --resource-group $AZURE_RESOURCE_GROUP
   ```

2. Verify environment variables:
   ```bash
   az containerapp show \
     --name nextjs-app \
     --resource-group $AZURE_RESOURCE_GROUP \
     --query properties.template.containers[0].env
   ```

### Issue: Can't reach Gotenberg from Next.js

1. Verify Gotenberg is running:
   ```bash
   az containerapp show --name gotenberg --resource-group $AZURE_RESOURCE_GROUP --query properties.provisioningState
   ```

2. Check the internal FQDN is correct:
   ```bash
   az containerapp show \
     --name gotenberg \
     --resource-group $AZURE_RESOURCE_GROUP \
     --query properties.configuration.ingress.fqdn
   ```

3. Verify GOTENBERG_URL environment variable in Next.js app matches exactly.

### Issue: Image push fails

1. Verify ACR credentials:
   ```bash
   az acr login --name $AZURE_CONTAINER_REGISTRY
   ```

2. Check ACR status:
   ```bash
   az acr show --name $AZURE_CONTAINER_REGISTRY
   ```

## Complete Automation Script

Save this as `deploy.sh` to automate the entire process:

```bash
#!/bin/bash
set -e

# Configuration
export AZURE_RESOURCE_GROUP="myapp-rg"
export AZURE_REGION="eastus"
export AZURE_CONTAINER_REGISTRY="myappcr"
export AZURE_CONTAINER_APPS_ENV="myapp-env"
export NEXTJS_IMAGE_NAME="nextjs-app"
export NEXTJS_IMAGE_TAG="latest"

echo "🚀 Starting Azure Container Apps deployment..."

# Step 1: Create resource group
echo "📁 Creating resource group..."
az group create \
  --name $AZURE_RESOURCE_GROUP \
  --location $AZURE_REGION

# Step 2: Create ACR
echo "📦 Creating container registry..."
az acr create \
  --resource-group $AZURE_RESOURCE_GROUP \
  --name $AZURE_CONTAINER_REGISTRY \
  --sku Basic

# Step 3: Enable admin
az acr update \
  --name $AZURE_CONTAINER_REGISTRY \
  --admin-enabled true

# Step 4: Build and push image
echo "🔨 Building and pushing Docker image..."
az acr build \
  --registry $AZURE_CONTAINER_REGISTRY \
  --image $NEXTJS_IMAGE_NAME:$NEXTJS_IMAGE_TAG \
  --file Dockerfile .

# Step 5: Create environment
echo "🌍 Creating Container Apps environment..."
az containerapp env create \
  --name $AZURE_CONTAINER_APPS_ENV \
  --resource-group $AZURE_RESOURCE_GROUP \
  --location $AZURE_REGION

# Step 6: Deploy Gotenberg
echo "🔧 Deploying Gotenberg (internal)..."
az containerapp create \
  --name gotenberg \
  --resource-group $AZURE_RESOURCE_GROUP \
  --environment $AZURE_CONTAINER_APPS_ENV \
  --image gotenberg/gotenberg:8 \
  --target-port 3000 \
  --cpu 2.0 \
  --memory 2.0Gi \
  --ingress internal

# Get Gotenberg FQDN
GOTENBERG_FQDN=$(az containerapp show \
  --name gotenberg \
  --resource-group $AZURE_RESOURCE_GROUP \
  --query properties.configuration.ingress.fqdn \
  --output tsv)

echo "✅ Gotenberg FQDN: $GOTENBERG_FQDN"

# Step 7: Deploy Next.js app
echo "🚀 Deploying Next.js app (public)..."
ACR_LOGIN_SERVER=$(az acr show \
  --name $AZURE_CONTAINER_REGISTRY \
  --query loginServer \
  --output tsv)

az containerapp create \
  --name nextjs-app \
  --resource-group $AZURE_RESOURCE_GROUP \
  --environment $AZURE_CONTAINER_APPS_ENV \
  --image $ACR_LOGIN_SERVER/$NEXTJS_IMAGE_NAME:$NEXTJS_IMAGE_TAG \
  --target-port 3000 \
  --ingress external \
  --cpu 1.0 \
  --memory 1.0Gi \
  --registry-login-server $ACR_LOGIN_SERVER \
  --registry-username $(az acr credential show --name $AZURE_CONTAINER_REGISTRY --query "username" --output tsv) \
  --registry-password $(az acr credential show --name $AZURE_CONTAINER_REGISTRY --query "passwords[0].value" --output tsv) \
  --env-vars \
    GOTENBERG_URL="http://$GOTENBERG_FQDN" \
    NODE_ENV="production"

# Get Next.js app FQDN
NEXTJS_PUBLIC_URL=$(az containerapp show \
  --name nextjs-app \
  --resource-group $AZURE_RESOURCE_GROUP \
  --query properties.configuration.ingress.fqdn \
  --output tsv)

echo ""
echo "✅ Deployment completed successfully!"
echo "📝 Your application is available at: https://$NEXTJS_PUBLIC_URL"
echo "🔧 Gotenberg internal FQDN: $GOTENBERG_FQDN"
```

Make it executable and run:
```bash
chmod +x deploy.sh
./deploy.sh
```

## Monitoring and Logging

### Set Up Application Insights (Optional)

```bash
# Create Application Insights resource
az monitor app-insights component create \
  --app myapp-insights \
  --location $AZURE_REGION \
  --resource-group $AZURE_RESOURCE_GROUP

# Link to Container Apps
az containerapp update \
  --name nextjs-app \
  --resource-group $AZURE_RESOURCE_GROUP \
  --application-insights-key <INSTRUMENTATION_KEY>
```

## Summary

Your deployment now has:
- ✅ **Gotenberg** running as an internal service (no public access, reduced costs)
- ✅ **Next.js app** publicly accessible via Azure Container Apps
- ✅ **Automatic networking** between services using internal FQDN
- ✅ **Environment variable injection** for dynamic configuration
- ✅ **Production-ready setup** with health checks and resource limits

The Next.js app will communicate with Gotenberg through the internal Azure network, providing secure, fast document conversion without exposing Gotenberg to the internet.

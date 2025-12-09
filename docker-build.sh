#!/bin/bash

APP_NAME="verse-first-frontend"
IMAGE_TAG="latest"

echo "==== Installing Node dependencies ===="
npm ci || { echo "NPM install failed"; exit 1; }

echo "==== Building Docker image ===="
docker build -t ${APP_NAME}:${IMAGE_TAG} .

echo "==== Done ===="
echo "Run with: docker run -p 3000:3000 ${APP_NAME}:${IMAGE_TAG}"
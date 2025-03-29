# Multi-stage build for Web3 Crypto Streaming Service

# Build stage
FROM node:18-alpine AS build

WORKDIR /app

# Install dependencies first (for better caching)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine AS production

# Copy built assets from 'build' stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom nginx config if needed
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

# Development stage
FROM node:18-alpine AS development

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies including dev dependencies
RUN npm install

# Add project files
COPY . .

# Expose development port
EXPOSE 8080

# Start development server
CMD ["npm", "run", "serve"]

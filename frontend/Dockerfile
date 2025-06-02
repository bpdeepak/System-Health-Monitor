# frontend/Dockerfile

# --- Stage 1: Build the React application ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package*.json ./
RUN npm install

# Copy the rest of your application code
COPY . .

# Declare a build argument for the backend URL
ARG REACT_APP_BACKEND_URL

# Set it as an environment variable DURING THE BUILD PROCESS
# This is crucial for Create React App to embed it into the JS bundle
ENV REACT_APP_BACKEND_URL=${REACT_APP_BACKEND_URL}
ENV NODE_ENV=production
# Run the build command
RUN npm run build

# --- Stage 2: Serve the built application with Nginx ---
FROM nginx:alpine

# Remove default Nginx config to replace it cleanly
RUN rm /etc/nginx/conf.d/default.conf

# Copy your custom Nginx configuration to the container
# This path (nginx/nginx.conf) is relative to the Docker build context (your 'frontend' folder)
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built React app from the builder stage
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
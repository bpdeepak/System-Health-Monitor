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

# Copy the built React app from the builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Optional: Copy a custom Nginx configuration if you have one.
# For a basic React app, the default Nginx config often works fine.
# If your app requires specific routing or rewrites (e.g., for React Router HTML5 mode),
# you might need a custom /etc/nginx/conf.d/default.conf
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 where Nginx will serve the React app
EXPOSE 80

# Command to run Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
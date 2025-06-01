# frontend/Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# For development, you can run `npm start` which typically serves on port 3000 inside the container.
# However, your docker-compose.yml maps 3000:80.
# Let's ensure `npm run build` is part of the Dockerfile build process for production-like serving
# and then use a lightweight server like `serve`.

# Multi-stage build for production-ready frontend serving
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --silent
COPY . .
RUN npm run build

# Final stage
FROM node:20-alpine 
WORKDIR /app

# Install serve globally (and fix path issues on Alpine)
RUN npm install -g serve && \
    ln -s /usr/local/bin/serve /bin/serve

COPY --from=builder /app/build ./build/

EXPOSE 80
CMD ["serve", "-s", "build", "-l", "80"]

# Stage 1: Build the React frontend
FROM node:20-alpine AS builder
WORKDIR /app
COPY genpact-prep/package*.json ./
RUN npm install
COPY genpact-prep/ ./
RUN npm run build

# Stage 2: Run the production application
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY genpact-prep/package*.json ./
RUN npm install
COPY genpact-prep/backend ./backend
COPY --from=builder /app/build ./build

EXPOSE 5000
CMD ["node", "backend/server.js"]

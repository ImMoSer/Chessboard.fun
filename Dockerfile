# Build stage
FROM node:22-alpine AS build-stage
WORKDIR /app

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files first to leverage Docker layer caching
COPY package.json pnpm-lock.yaml ./

# Install dependencies before copying source code
# (this layer will be cached unless package.json or pnpm-lock.yaml changes)
RUN pnpm install --frozen-lockfile

# Copy the rest of the source code
COPY . .

# Build the application
# Прописываем переменные напрямую для гарантии сборки
ENV VITE_BACKEND_API_URL=/api
ENV VITE_APP_VERSION=4.7.5

RUN pnpm run build-only

# Production stage
FROM nginx:stable-alpine AS production-stage
COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

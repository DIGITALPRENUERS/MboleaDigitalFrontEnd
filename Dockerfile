# syntax=docker/dockerfile:1
# Avoid npm cache under node_modules/.cache — Railway's generated builds use a cache mount there and hit EBUSY with npm ci.
FROM node:22-alpine AS build
WORKDIR /app
ENV NPM_CONFIG_CACHE=/tmp/npm-cache

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NPM_CONFIG_CACHE=/tmp/npm-cache

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY scripts/static-server.mjs ./scripts/static-server.mjs
COPY --from=build /app/dist ./dist

# HTTP/1.1 via node:http (see scripts/static-server.mjs). Listen port = $PORT (Railway sets this, often 8080).
# EXPOSE is only a hint; do not set Railway public "target port" to 3000 unless logs show PORT=3000.
EXPOSE 8080
CMD ["node", "scripts/static-server.mjs"]

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

# HTTP/1.1 via node:http (see scripts/static-server.mjs) — required for Railway’s proxy; `serve` CLI uses HTTP/2 and causes 502.
EXPOSE 3000
CMD ["node", "scripts/static-server.mjs"]

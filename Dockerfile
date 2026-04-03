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

COPY --from=build /app/dist ./dist

EXPOSE 3000
CMD ["sh", "-c", "exec ./node_modules/.bin/serve -s dist -l tcp://0.0.0.0:${PORT:-3000}"]

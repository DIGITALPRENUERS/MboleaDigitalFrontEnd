# syntax=docker/dockerfile:1
# Build SPA, then serve with nginx (HTTP/1.1) — reliable behind Railway’s edge; avoids Node proxy quirks + 502s.
FROM node:22-alpine AS build
WORKDIR /app
ENV NPM_CONFIG_CACHE=/tmp/npm-cache

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template

# Railway injects PORT at runtime; nginx entrypoint runs envsubst on templates.
# https://docs.railway.com/networking/troubleshooting/application-failed-to-respond
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]

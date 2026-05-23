# syntax=docker/dockerfile:1
# Кэш npm ускоряет повторные сборки (нужен BuildKit: DOCKER_BUILDKIT=1 или docker compose build)
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .

ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

ARG VITE_YANDEX_MAPS_API_KEY=
ENV VITE_YANDEX_MAPS_API_KEY=$VITE_YANDEX_MAPS_API_KEY

RUN npm run build

FROM nginx:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.docker.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

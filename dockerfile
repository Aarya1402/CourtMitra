# 🔨 Build stage
FROM node:22 AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

# 👇 Build with envs available
ARG VITE_TALKUMENT_API_BASE
ARG VITE_WS_URL
ARG VITE_API_BASE
ARG API_BASE_URL
ARG VITE_SENTRY_DSN

ENV VITE_TALKUMENT_API_BASE=$VITE_TALKUMENT_API_BASE
ENV VITE_WS_URL=$VITE_WS_URL
ENV VITE_API_BASE=$VITE_API_BASE
ENV API_BASE_URL=$API_BASE_URL
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN

RUN npm run build

# Stage 2: Serve
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
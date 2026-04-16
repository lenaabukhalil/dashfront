FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN rm -f package-lock.json && npm install --legacy-peer-deps
COPY . .
ARG VITE_APP_VERSION=1.0.0
ENV VITE_APP_VERSION=$VITE_APP_VERSION
RUN npm run build

FROM nginx:alpine
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx/nginx.conf /etc/nginx/conf.d/ion-dashboard.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
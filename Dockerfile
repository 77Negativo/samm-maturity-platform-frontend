FROM node:20-alpine@sha256:b88333c42c23fbd91596ebd7fd10de239cedab9617de04142dde7315e3bc0afa AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci && npm cache clean --force

COPY index.html vite.config.js ./
COPY src ./src

RUN npm run build

FROM nginx:alpine@sha256:f46cb72c7df02710e693e863a983ac42f6a9579058a59a35f1ae36c9958e4ce0

ENV UPSTREAM_API_URL=http://host.docker.internal:3000

COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/docker-entrypoint.sh /docker-entrypoint.sh
COPY --from=build /app/dist /usr/share/nginx/html

RUN sed -i 's|^user .*;|# user disabled for non-root runtime;|' /etc/nginx/nginx.conf \
  && chmod 755 /docker-entrypoint.sh \
  && chown -R nginx:nginx /usr/share/nginx/html /etc/nginx/templates /var/cache/nginx /docker-entrypoint.sh /etc/nginx/nginx.conf \
  && touch /tmp/nginx.pid \
  && chown nginx:nginx /tmp/nginx.pid

USER nginx

EXPOSE 8080

ENTRYPOINT ["/docker-entrypoint.sh"]

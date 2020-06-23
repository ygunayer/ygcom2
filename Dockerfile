FROM node:14-alpine AS build
WORKDIR /tmp/app
ADD . .
RUN npm i && \
    npm run build && \
    cp -r public/ /www && \
    cd /www && \
    rm -rf /tmp/app && \
    npm cache clean -f

FROM nginx:1.12.1-alpine AS runtime
COPY --from=0 /www /var/www
COPY ./build/nginx_template.conf /etc/nginx/conf.d/yalingunayer.com.conf
RUN rm /etc/nginx/conf.d/*.conf
EXPOSE 80
CMD nginx -g "daemon off;"

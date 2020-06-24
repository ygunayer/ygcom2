FROM node:14-alpine AS build
WORKDIR /tmp/app
ADD . .
RUN npm i && \
    npm run build && \
    cp -r public/ /www && \
    cp ./build/nginx_template.conf /nginx_template.conf && \
    cd /www && \
    rm -rf /tmp/app && \
    npm cache clean -f

FROM nginx:1.12.1-alpine AS runtime
COPY --from=0 /www /var/www
RUN rm /etc/nginx/conf.d/*.conf
COPY --from=0 /nginx_template.conf /etc/nginx/conf.d/yalingunayer.com.conf
EXPOSE 80
CMD nginx -g "daemon off;"

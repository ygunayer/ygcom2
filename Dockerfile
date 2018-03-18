FROM nginx:1.12.1-alpine

COPY ./public /var/www

EXPOSE 80

RUN rm /etc/nginx/conf.d/*.conf

COPY ./build/nginx_template.conf /etc/nginx/conf.d/yalingunayer.com.conf

CMD nginx -g "daemon off;"

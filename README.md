# ygcom2
The content and metadata for my personal website, [http://yalingunayer.com](http://yalingunayer.com).

## Running
### Theme
In contrast to most Hexo websites, this website includes its theme directly in the repository, so it must be built before running the website. Similarly, in order for the changes in the theme's source code to be reflected on the website's appearance, it must be rebuilt.

```bash
$ npm run build:theme
```

> The theme's build process does not support live development mode, so the build script must be run manually after each change.

### Website
#### Live Mode
This is an ephemeral mode intended for development environments as it runs a Hexo server instance in the background, which in turn watches your files for any changes and reloads any open website session using BrowserSync once a change occurs. To run the website in this mode, simply run the following command:

```
hexo server
```

If you're interested in a more verbose output, enable debug logging.

```
hexo server --debug
```

#### Static Mode
This is more like a build/compile step rather than a run mode, as it generates static HTML files for all possible pages that might exist in your website, and also the any files that can be served statically (CSS, JS, fonts, etc.). As you might guess, this is intended for production environments. To build the website in this manner, simply run the following command:

```bash
$ hexo generate
```

There's also an NPM script that runs the same command.

```bash
$ npm run build:website
```

This generates all static files and puts them under the `public/` folder. At this point, you no longer need anything other than a browser to open the website locally; and to serve it publicly, the only thing you need is some kind of web server with static content serving capabilities, such as Nginx.

Here's a sample Nginx configuration:

```
server {
    listen 80;
    server_name yalingunayer.com;

    location / {
        root /repos/ygcom2/public;
        error_page 404 /404/index.html;
        index index.html;
        autoindex off;
    }
}
```

If you have Python installed, you can simply spin up a SimpleHTTPServer instance to serve the `public/` folder

```bash
$ cd public/
$ python -m SimpleHTTPServer 8080
```

## Docker
To package the website as a Docker image, simply run `docker build` with the tag of your choice. The website will be built entirely within a Docker container, and the build artifacts will be handed over to a lightweight `nginx` Docker image with no clutter or leftovers from the build process.

```bash
$ docker build -t ygunayer/yalingunayer.com:dev
$ docker run -p 80:80 --rm ygunayer/yalingunayer.com:dev
```

### License
MIT

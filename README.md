The content and metadata for my personal website, [http://yalingunayer.com](http://yalingunayer.com)

I've re-used all content from the my previous website repository, [ygunayer/yalingunayer.com](https://github.com/ygunayer/yalingunayer.com)

## Running
The site is built on the static content generator [Hexo](https://github.com/hexojs/hexo), and was bootstrapped by using `hexo init`. Hexo has two run modes, live and static. To build the site, simply install the dependencies using `npm install`, then pick a run mode:

### Live Mode
This is an ephemeral mode intended for development environments as it runs a Hexo server instance in the background, which in turn watches your files for any changes and reloads any open website session using BrowserSync once a change occurs. To run the website in this mode, simply run the following command:

```
hexo server
```

If you're interested in a more verbose output, enable debug logging.

```
hexo server --debug
```

### Static Mode
This is more like a build/compile step rather than a run mode, as it generates static HTML files for all possible pages that might exist in your website, and also the any files that can be served statically (CSS, JS, fonts, etc.). As you might guess, this is intended for production environments. To build the website in this manner, simply run the following command:

```
hexo generate
```

This generates all static files and puts them under the `public/` folder. At this point, you no longer need anything other than a browser to open the website locally; and to serve it publicly, the only thing you need is some kind of web server with static content serving capabilities, such as Nginx.

## Installing the Theme
The website uses the [ygunayer/yg-apollo](https://github.com/ygunayer/yg-apollo) theme by default (configurable at [_config.yml](_config.yml)). See the [Installation section](https://github.com/ygunayer/yg-apollo#Installation) in the `yg-apollo` documentation for instructions on how to install the theme.

### License
MIT

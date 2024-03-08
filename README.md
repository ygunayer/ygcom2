# Notice
This repository is now archived and no longer receiving updates.

Refer to [ygunayer/yalin.dev](https://github.com/ygunayer/yalin.dev) for the more recent and up-to-date version.

# ygcom2
The source code for my personal website, [http://yalingunayer.com](http://yalingunayer.com), built using Hexo.

## Development
Once you've installed the dependencies via `npm i`, simply run the following command to run Hexo (for the website) and Parcel (for the theme) in watch mode:

```bash
$ npm run start
```

If you'd like to specifically run the theme or website in watch mode, you can run `npm run start:theme` or `npm run start:website` respectively.

## Building
### Generating the Static Content
As with any static website, the build process of ygcom2 is two-fold: build the theme and generate the static command.  Unlike most other Hexo websites, this website includes its theme directly in the repository, so the order of these steps is important. To run both commands consecutively, you can simply run the following command:

```bash
$ npm run build
```

If you'd like to run the steps individually, you can run `npm run build:theme` to build the theme, or `npm run build:website` to generate the content.

*Note:* The navigation generated content omits the filenames, so in order for routing to work, you must place the output on a static file server that serves the content at the root folder. A simple way of doing this is to simply navigate into the `public/` directory and run `python -m SimpleHTTPServer`.

### Generating a Docker Image
To package the website as a Docker image, simply run `docker build` with the tag of your choice. The website will be built entirely within a Docker container, and the build artifacts will be handed over to a lightweight `nginx` Docker image with no clutter or leftovers from the build process.

```bash
$ docker build -t ygunayer/yalingunayer.com:dev
$ docker run -p 80:80 --rm ygunayer/yalingunayer.com:dev
```

### License
MIT

const util = require('util');
const path = require('path');
const fs = require('fs');
const rimraf = (() => {
  const rimraf = require('rimraf');
  return util.promisify(rimraf).bind(rimraf);
})();
const Bundler = require('parcel-bundler');

async function build({isDev = false}) {
  const srcDir = path.join(__dirname, 'src');
  const outDir = path.join(__dirname, 'source');

  const inputFile = path.join(srcDir, 'scss/apollo.scss');
  const bundler = new Bundler(inputFile, {
    outDir,
    hmr: isDev,
    watch: isDev,
    autoInstall: false,
    detailedReport: true
  });

  await rimraf(outDir);
  await bundler.bundle();
  await fs.promises.copyFile(path.join(srcDir, 'favicon.png'), path.join(outDir, 'favicon.png'));
}

build({isDev: process.env.NODE_ENV !== 'production'})
  .catch(err => {
    console.error(err);
    process.exit(-1);
  });

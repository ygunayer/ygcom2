#!/bin/sh
set -e

VERSION="$1"
if [ -z "$VERSION" ]; then
    echo "Please specify a version."
    exit 1
fi

echo "Building version $VERSION"

git submodule update --init --recursive
npm i
(cd themes/yg-apollo; npm i; gulp)
hexo generate
docker build -t ygunayer/yalingunayer.com:latest -t ygunayer/yalingunayer.com:$VERSION .

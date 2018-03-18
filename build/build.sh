#!/bin/sh
VERSION=$(cat VERSION)
echo "Building version $VERSION"

git submodule update --init --recursive
yarn
(cd themes/yg-apollo; yarn; gulp)
hexo generate
docker build -t ygunayer/yalingunayer.com:latest -t ygunayer/yalingunayer.com:$VERSION .

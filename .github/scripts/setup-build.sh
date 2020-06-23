#!/usr/bin/env bash

REF_ID=${GITHUB_REF##*/}
IMAGE_TAG="ygunayer/yalingunayer.com:$REF_ID"

SHOULD_PUBLISH="0"
re="refs\/tags\/[0-9]+\.[0-9]+\.[0-9]+"
if [[ "$GITHUB_EVENT_NAME" -eq "push" ]] && [[ "$GITHUB_REF" =~ $re ]]; then
    SHOULD_PUBLISH="1"
fi

echo "::set-env name=IMAGE_TAG::$IMAGE_TAG"
echo "::set-env name=SHOULD_PUBLISH::$SHOULD_PUBLISH"
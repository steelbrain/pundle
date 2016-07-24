#!/usr/bin/env bash

# Usage:
# To run specs in all packages do `./test.sh`
# To run specs in a specific package named 'fs' do `PACKAGE_NAME=fs ./test.sh`

ROOT_DIRECTORY=$( cd $(dirname $0)/.. ; pwd -P )
PACKAGES_PATH=${ROOT_DIRECTORY}/packages
if [ "$PACKAGE_NAME" != "" ]; then
  PACKAGES=$PACKAGE_NAME
else
  PACKAGES=( "generator" "browser" "babel" "npm-installer" "fs" "pundle" "middleware" "dev" )
fi

if [ "$1" = "--watch" ]; then
  OPERATION="watch"
else
  OPERATION="go"
fi
export PATH=$PATH:${ROOT_DIRECTORY}/node_modules/.bin
export NODE_PATH=${ROOT_DIRECTORY}/node_modules

cd "${ROOT_DIRECTORY}"
npm run clean

for name in "${PACKAGES[@]}"
do :
  cd ${PACKAGES_PATH}/${name}
  ucompiler "${OPERATION}" &
  if [ $? -eq 1 ]; then
    exit 1
  fi
done

cd "${ROOT_DIRECTORY}"
sleep 5
chmod +x packages/*/lib/bin/*
wait

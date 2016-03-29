#!/usr/bin/env bash

# Usage:
# To build all packages do `./build.sh`
# To build a specific package named 'fs' do `PACKAGE_NAME=fs ./build.sh`
# To watch and not just build, do `./build.sh --watch`

ROOT_DIRECTORY=$( cd $(dirname $0) ; pwd -P )/..
PACKAGES_PATH=${ROOT_DIRECTORY}/packages
if [ "$PACKAGE_NAME" != "" ]; then
  PACKAGES_WITH_SPECS=$PACKAGE_NAME
else
  PACKAGES_WITH_SPECS=( "pundle" )
fi
if [ "$1" != "--watch" ]; then
  INSTRUCTION="go"
else
  INSTRUCTION="watch"
fi

for name in "${PACKAGES_WITH_SPECS[@]}"
do :
  cd ${PACKAGES_PATH}/${name}
  ucompiler "${INSTRUCTION}" &
done

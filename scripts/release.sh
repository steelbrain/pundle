#!/bin/bash

ACTION=$1

# Usage: ./scripts/release.sh (major|minor|patch)

ROOT_DIRECTORY=$( cd $(dirname $0)/.. ; pwd -P )
PACKAGES_PATH=${ROOT_DIRECTORY}/packages
PACKAGES=( "babel" "dev" "fs" "middleware" "npm-installer" "pundle" )

${ROOT_DIRECTORY}/scripts/build.sh

for name in "${PACKAGES[@]}"
do :
  cd ${PACKAGES_PATH}/${name}
  npm version "${ACTION}" --no-git-tag-version
  if [ $? -eq 1 ]; then
    exit 1
  fi
  npm publish
  if [ $? -eq 1 ]; then
    exit 1
  fi
done

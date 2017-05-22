#!/bin/bash

cd $(dirname $0)/..
ROOT_DIRECTORY=$(pwd)

find . -name *.js.flow | grep -v node_modules | xargs rm -f

for PACKAGE in $(ls packages); do
  if [ ! -d "$ROOT_DIRECTORY/packages/$PACKAGE/src" ]; then
    continue
  fi
  cd $ROOT_DIRECTORY/packages/$PACKAGE
  mkdir -p lib

  ENTRIES=$(cd src; find . -name "*.js")
  for ENTRY in $ENTRIES; do
    ENTRY_TRIMMED=${ENTRY:2}
    mkdir -p lib/$(dirname $ENTRY_TRIMMED)
    ln src/$ENTRY_TRIMMED lib/$ENTRY_TRIMMED.flow
  done
  echo "Linked $PACKAGE"
done

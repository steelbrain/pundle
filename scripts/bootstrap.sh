#!/usr/bin/env bash

ROOT_DIRECTORY=$( cd $(dirname $0) ; pwd -P )/..
PACKAGES_PATH=${ROOT_DIRECTORY}/packages
# NOTE: Order is important
PACKAGES_TO_LINK=( "babel" "fs" "pundle" )
NPM_ROOT=$( npm root -g )

cd ${ROOT_DIRECTORY}
npm install

for name in "${PACKAGES_TO_LINK[@]}"
do :
  cd ${PACKAGES_PATH}/${name}

  printf "Pruning in "${name}"\n"
  npm prune 1>/dev/null 2>/dev/null
  mkdir -p node_modules
  rm -rf node_modules/pundle-*

  printf "Linking in other packages\n"
  manifest_contents=$(cat package.json)
  dependencies=$(printf "${manifest_contents#*dependencies}" | grep -E "pundle-.*?\": " | perl -pe 's|"(\S+)":.*|\1|')
  if [ -n "${dependencies}" ]; then
    for dependency in ${dependencies}
    do :
      printf "Linking "${dependency}" in "${name}"\n"
      npm link ${dependency} --loglevel=error
    done
  fi

  printf "Installing dependencies\n"
  # to install devDependencies in packages
  npm install --development

  printf "Linking self\n"
  npm link --loglevel=error

  printf "\n"
done

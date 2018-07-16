# Pundle - NG (Beta)

<p align="center">
  <img height="100px" src="https://user-images.githubusercontent.com/4278113/41994587-f737ebf8-7a5f-11e8-8547-c60531960a05.png">
</p>

<p align="center">
  modern javascript bundler
</p>

<p align="center">
  <a href="http://badge.fury.io/js/pundle"><img alt="npm version" src="https://badge.fury.io/js/pundle.svg"></a>
  <a href="https://npmjs.org/package/pundle-core"><img alt="Downloads" src="http://img.shields.io/npm/dm/pundle-core.svg"></a>
  <a href="https://circleci.com/gh/steelbrain/pundle/tree/master">
    <img src="https://img.shields.io/circleci/project/steelbrain/pundle/master.svg" alt="CircleCI Build Status">
  </a>
</p>

Pundle is a next generation module bundler. It's written with extensibility and performance in mind.

This is the NG Beta branch. See [master](https://github.com/steelbrain/pundle/tree/master)

## Top Priority

- toml
- create-pundle-vue-app
- visualize dependency file size

## Note to self

- "ModuleScopePlugin" to limit direct import of files
- ESlint to lint files
- load .graphql files?
- enforce case sensitivity?
- FileSizeReporter (or https://github.com/webpack-contrib/webpack-bundle-analyzer?)

## Post-initial demo goals

- Chunk minifers for HTML / CSS
- Make tool to analyze cost of imports in app
- Fork browser field resolver, it's so wasteful of fs
- SSR

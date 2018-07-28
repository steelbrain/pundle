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

## Getting Started

Pundle is still in Beta but it's pretty stable. Here's how you can try it today!

For Yarn users

```sh
# For a react app with babel + hmr preconfigured
yarn create pundle-react-app my-app
# For a pure bare bones app
yarn create pundle-app my-app
```

If you have Node v8+

```sh
# For a react app with babel + hmr preconfigured
npm init pundle-react-app my-app
# For a pure bare bones app
npm init pundle-app my-app
```

## Top Priority

- docs

## Note to self

- "ModuleScopePlugin" to limit direct import of files
- ESlint to lint files
- enforce case sensitivity?

## Post-initial demo goals

- visualize dependency file size
- Chunk minifers for HTML
- Make tool to analyze cost of imports in app
- Fork browser field resolver, it's so wasteful of fs
- SSR

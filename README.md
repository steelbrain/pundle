# Pundle - NG (pre-alpha)

This is the WIP NG branch. See [master](https://github.com/steelbrain/pundle/tree/master)

## Top Priority

- Lazy init in dev server
- HMR
- CLI
- Boot from cache
- visualize dependency file size
- create-pundle-app
- create-pundle-react-app
- create-pundle-vue-app
- pundle-transformer-webassembly
- pundle-transformer-webassembly-rust

## Note to self

- split commons as chunk with configurable name
- "ModuleScopePlugin" to limit direct import of files
- ESlint to lint files
- load .graphql files?
- enforce case sensitivity?
- fix for https://github.com/facebook/create-react-app/issues/186 ?
- FileSizeReporter (or https://github.com/webpack-contrib/webpack-bundle-analyzer?)

## Features Included

- less
- scss
- babel
- uglify (Babili?)
- postcss
- resolver?
- typescript
- css file support
- html file support
- create a commons chunk
- resolve (browser fields?)
- statics in a chunk (blobs?)
- node builtin modules in browser
- watcher to automatically recompile
- we have chunk specific file types {js,html,css,blob}

Types of components:

- issue-reporter
- file-resolver
- file-loader
- file-transformer
- job-transformer
- chunk-generator
- chunk-transformer (todo)

## Post-initial demo goals

- Explore chokidar alternatives (perhaps write own abstraction on top of https://www.npmjs.com/package/nsfw (is sfw, just weird name))
- Make tool to analyze cost of imports in app
- Fork browser field resolver, it's so wasteful of fs

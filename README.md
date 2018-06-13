# Pundle - NG (pre-alpha)

This is the WIP NG branch. See [master](https://github.com/steelbrain/pundle/tree/master)

## Top Priority

- CLI
- visualize dependency file size
- create-pundle-app
- create-pundle-react-app
- create-pundle-vue-app

## Note to self

- How to inject ENV into bundle?
- url() in css. Fix it
- "ModuleScopePlugin" to limit direct import of files
- ESlint to lint files
- load .graphql files?
- enforce case sensitivity?
- FileSizeReporter (or https://github.com/webpack-contrib/webpack-bundle-analyzer?)

## Features Included

- less
- scss
- babel
- uglify (babel-minify?)
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

- Chunk minifers for HTML / CSS
- Make tool to analyze cost of imports in app
- Fork browser field resolver, it's so wasteful of fs

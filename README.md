# Pundle - NG (pre-alpha)

## Note to self

- pundle-transformer-postcss with plugin support, like autoprefixer and flexbugs-fixes
- split commons as chunk with configurable name
- "ModuleScopePlugin" to limit direct import of files
- ESlint to lint files
- load .graphql files?
- enforce case sensitivity?
- fix for https://github.com/facebook/create-react-app/issues/186 ?
- FileSizeReporter

## Features to include

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

- Make tool to analyze cost of imports in app
- Fork browser field resolver, it's so wasteful of fs

# Pundle - NG (pre-alpha)

## Note to self

- Implement chunk dependency on each other

## Features to include

- typescript
- babel
- uglify
- css file support
- postcss
- node builtin modules in browser
- resolver?
- html file support
- statics in a chunk (blobs?)
- create a commons chunk
- resolve (browser fields?)
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


## Notes

- `babel-plugin-minify-dead-code-elimination` increases the compile time of a React app from 1116ms to 2214ms

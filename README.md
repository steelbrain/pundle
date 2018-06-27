# Pundle - NG (pre-alpha)

This is the WIP NG branch. See [master](https://github.com/steelbrain/pundle/tree/master)

## Top Priority

- fs.readFile*()
- visualize dependency file size
- create-pundle-app
- create-pundle-react-app
- create-pundle-vue-app

## Note to self

- url() in css. Fix it
- source maps for css in dev
- "ModuleScopePlugin" to limit direct import of files
- ESlint to lint files
- load .graphql files?
- enforce case sensitivity?
- FileSizeReporter (or https://github.com/webpack-contrib/webpack-bundle-analyzer?)

## Post-initial demo goals

- Chunk minifers for HTML / CSS
- Make tool to analyze cost of imports in app
- Fork browser field resolver, it's so wasteful of fs

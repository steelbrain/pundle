#### 1.1.3

- Fix a bug where HMR would be applied without order

#### 1.1.2

- Fix browser field support for `../` requires

#### 1.1.1

- Fix the default value of `process.env.NODE_ENV`
- Fix a bug where babel-generator wasn't published :facepalm:
- Use [`lerna`](https://github.com/lerna/lerna) to manage monorepo setup to make sure that problem doesn't happen again

#### 1.1.0

- Add `generated` to dev server config
- Search node modules outside the root directory
- Resolve root directory and source root on initialization
- Fix a bug where installer doesn't quit the loop when the module is invalid (#54)

#### 1.0.2

- Fix HMR for deep modules
- Expose `clearCache` yet again
- Fix a race condition in watcher
- Confirm full support for `browser` field
- Wrap output in IIFE to avoid global pollution
- Fix a bug where server would not close on dispose in `pundle-dev`
- Fix a bug where source maps from babel compiled files won't show line numbers

#### 1.0.1

- Fix a typo in `pundle` which would not let the `babel` plugin work

#### 1.0.0

- Full rewrite
- Upgrade `sb-exec` to include bugfixes in npm installer
- Split browser polyfills of core modules into a separate package (`pundle-browser`)
- Split generator into a separate package to allow customizable generator
- Allow extension specific module loaders to process imports
 - Add support for `require`ing `.json` files
- Make babel generator output compact (gives us a 2x Speed boost!?!?!)
- Improve garbage collection
- Remove `pundle-middleware`
- Add `config.pathType` to allow hiding fs paths in output
- Add nice CLIs for dev server and pundle
- Add support for polling based watching, making Pundle usable in docker mounts

#### Pre 1.0

- Fix npm installer in non-shell envs like docker containers
- Fix compatibility issues with the execution helper
- Add `wss` support to HMR
- Fix support for GET parameters in dev server
- Fix a bug where HMR would fail for `$root`
- Skip source-map validation to workaround babel bugs
- Fix a bug where having a module located at `$root` would crash the app
- Fix support for local paths in npm installer
- Fix an internal bug in node traverser
- Fix a bug in HMR where dispose callbacks of modules won't be called unless they are accepting
- Make requests wait properly (Fixes #34)
- Fix HMR doubly-apply bug for complex scenarios
- Take two at fixing `babel-generator` bug
- Pin `babel-generator` version to avoid source-map bug
- Fix a bug where the error event won't be triggered sometimes
- Fix a bug where an error would be thrown randomly during initialization
- Do not push HMR for full bundle compiles as it crashes the browser window and hangs node for a lot of time
- Disable source code highlighting in Babel errors
- Expose `clearCache` on both pundle and sub compilations
- Fix a bug where HMR won't work
- Fix a typo which won't let `require`s to be rewritten to `__require`
- Fix source maps for compiled babel files
- Bump sb-resolve's version to include full support for `browser` field
- Upgrade sb-memoize to include fixes for several bugs including when it wouldn't detect new files and fail with not found errors
- Fix a bug in installer where it will try to install things it shouldn't
- Fix a bug where watcher would try to compile a file that's not required anywhere
- Properly delete modules from registry in watcher as they are removed
- Fix a bug where source maps would be a little off than usual
- Do not inline the source map when in middleware mode
- Local modules are no longer tried to be installed
- Modules with deep names like a/b are now handled properly
- Fix a bug where exports of deep modules won't be updated despite being executed in HMR
- Fix a bug where modules installer would be invoked twice for modules of the same name who are triggered at the same time
- Fix the same deployment issue in 0.0.6, release script coming soon to make sure it doesn't happen again
- Disable strict mode on the whole bundle to make certain modules work
- Fix another deployment issue, we don't have automated checks for this one yet but will have pretty soon
- Fix a deployment issue and also make sure it doesn't happen again
- Expose express app on dev server, it allows custom middleware integrations
- Add `sourceRoot` support to `pundle-middleware`
- Add `restrictToRoot` support in `pundle-npm-installer`
- Fix several bugs including in HMR and Babel transpilation
- Rename `require` to `__require` for compatibility with babel
- Fix a deployment issue with main module
- Initial release

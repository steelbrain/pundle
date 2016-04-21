#### 0.2.2

- Fix a bug where an error would be thrown randomly during initialization

#### 0.2.1

- Do not push HMR for full bundle compiles as it crashes the browser window and hangs node for a lot of time

#### 0.2.0

- Disable source code highlighting in Babel errors
- Expose `clearCache` on both pundle and sub compilations

#### 0.1.3

- Fix a bug where HMR won't work

#### 0.1.2

- Fix a typo which won't let `require`s to be rewritten to `__require`
- Fix source maps for compiled babel files

#### 0.1.1

- Bump sb-resolve's version to include full support for `browser` field

#### 0.1.0

- Upgrade sb-memoize to include fixes for several bugs including when it wouldn't detect new files and fail with not found errors
- Fix a bug in installer where it will try to install things it shouldn't
- Fix a bug where watcher would try to compile a file that's not required anywhere
- Properly delete modules from registry in watcher as they are removed
- Fix a bug where source maps would be a little off than usual
- Do not inline the source map when in middleware mode

#### 0.0.11

- Local modules are no longer tried to be installed
- Modules with deep names like a/b are now handled properly

#### 0.0.10

- Fix a bug where exports of deep modules won't be updated despite being executed in HMR
- Fix a bug where modules installer would be invoked twice for modules of the same name who are triggered at the same time

#### 0.0.9

- Fix the same deployment issue in 0.0.6, release script coming soon to make sure it doesn't happen again

#### 0.0.8

- Disable strict mode on the whole bundle to make certain modules work

#### 0.0.7

- Fix another deployment issue, we don't have automated checks for this one yet but will have pretty soon

#### 0.0.6

- Fix a deployment issue and also make sure it doesn't happen again

#### 0.0.5

- Expose express app on dev server, it allows custom middleware integrations

#### 0.0.4

- Add `sourceRoot` support to `pundle-middleware`
- Add `restrictToRoot` support in `pundle-npm-installer`
- Fix several bugs including in HMR and Babel transpilation
- Rename `require` to `__require` for compatibility with babel

#### 0.0.3

- Fix a deployment issue with main module

#### 0.0.2

- Initial release

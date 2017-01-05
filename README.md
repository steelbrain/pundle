![Pundle](https://raw.githubusercontent.com/motion/pundle/tree/steelbrain/docs/pundle.png)

<p align="center">
  A bundler without compromise.
</p>

<p align="center">
  <a href="http://badge.fury.io/js/pundle"><img alt="npm version" src="https://badge.fury.io/js/pundle.svg"></a>
  <a href="https://npmjs.org/package/pundle"><img alt="Downloads" src="http://img.shields.io/npm/dm/pundle.svg"></a>
  <a href="https://circleci.com/gh/motion/pundle/tree/master">
    <img src="https://img.shields.io/circleci/project/motion/pundle/master.svg" alt="CircleCI Build Status">
  </a>
</p>

Pundle is a next generation module bundler. It's written with extensibility and performance in mind and out performs any other bundler out there.

## Documentation

Pundle uses Mono-Repo architecture to manage npm packages, you can browse each module's individual documentation by visiting `packages/$NAME`.

Here are some quick links for you

- [Pundle](https://github.com/motion/pundle/blob/master/packages/pundle/README.md)
- [Pundle Dev Server](https://github.com/motion/pundle/blob/master/packages/dev/README.md)
- [Babel Plugin](https://github.com/motion/pundle/blob/master/packages/babel/README.md)
- [TypeScript Plugin](https://github.com/motion/pundle/blob/master/packages/typescript/README.md)
- [NPM Installer Plugin](https://github.com/motion/pundle/blob/master/packages/npm-installer/README.md)

## Setting up for development

Clone the repo and run these two commands for initial setup

```
 $ npm install
 $ npm run bootstrap
```

Then run either the `watch` or the `compile` npm scripts depending on the occasion.

After running those for the first time, make sure to link in the pundle cli by running `cd packages/cli; npm link`. You can then use the `pundle` cli (presuming you've added npm bin path to your PATH env var).

## License

This project is licensed under the terms of MIT License. See the LICENSE file for more info.

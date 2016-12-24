Pundle
======

Pundle is a next generation module bundler. It's written with extensibility and performance in mind and out performs any other bundler out there.

## Documentation

Pundle uses Mono-Repo architecture to manage npm packages, you can browse each module's individual documentation by visiting `packages/$NAME`.

Here are some quick links for you

- [Pundle](https://github.com/motion/pundle/blob/master/packages/pundle/README.md)
- [Pundle Dev Server](https://github.com/motion/pundle/blob/master/packages/dev/README.md)
- [TypeScript preset](https://github.com/motion/pundle/tree/master/packages/preset-typescript/README.md)
- [NPM Installer Plugin](https://github.com/motion/pundle/blob/master/packages/plugin-npm-installer/README.md)

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

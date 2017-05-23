<p align="center">
  <img height="100px" src="https://raw.githubusercontent.com/steelbrain/pundle/master/pundle-words.png">
</p>

<p align="center">
  modern javascript bundler
</p>

<p align="center">
  <a href="http://badge.fury.io/js/pundle"><img alt="npm version" src="https://badge.fury.io/js/pundle.svg"></a>
  <a href="https://npmjs.org/package/pundle"><img alt="Downloads" src="http://img.shields.io/npm/dm/pundle.svg"></a>
  <a href="https://circleci.com/gh/steelbrain/pundle/tree/master">
    <img src="https://img.shields.io/circleci/project/steelbrain/pundle/master.svg" alt="CircleCI Build Status">
  </a>
</p>

Pundle is a next generation module bundler. It's written with extensibility and performance in mind.

## Documentation

Welcome to the official documentation of Pundle, the peaceful module bundler of the 21st century.

### Introduction

This section contains the resources you need to get started with Pundle and to better understand how it all connects together.

- [Getting Started](./docs/introduction/getting-started.md)
- [Configuration](./docs/introduction/configuration.md)
- [CLI Usage](./docs/introduction/cli-usage.md)
- [Components](./docs/introduction/components.md) (the building blocks)
- [Presets](./docs/introduction/presets.md)

### Technical Introduction

This section contains the resources that help you write your own Components and Presets so you can get the most out of Pundle.

- [Life cycles](./docs/technical/lifecycles.md)
- [Components](./docs/technical/components.md)
- [Presets](./docs/technical/presets.md)

## Contributing

Clone the repo and run these two commands for initial setup

```
 $ npm install
 $ npm run bootstrap
```

Then run either the `watch` or the `compile` npm scripts depending on the occasion.

After running those for the first time, make sure to link in the pundle cli by running `cd packages/cli; npm link`. You can then use the `pundle` cli (presuming you've added npm bin path to your PATH env var).

## License

This project is licensed under the terms of MIT License. See the LICENSE file for more info.

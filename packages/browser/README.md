# Pundle-Browser

Browser compatible core module polyfills for Pundle.

## Installation

```
npm install --save pundle-browser
```

## Usage

```js
import { fs, events, os } from 'pundle-browser'

console.log(fs) // path to the entry point for `fs` module
require(fs) // browser friendly fs module

console.log(events) // path to the entry point for `events` module
require(events) // browser friendly events module
```

## License

This project is licensed under the terms of MIT License. See the LICENSE file at the root of the Github repo for more info.

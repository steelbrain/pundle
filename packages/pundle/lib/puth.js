'use strict';

// NOTE: Puth = Pundle + Path


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _path = require('path');

class Puth {

  constructor(config) {
    this.config = config;
  }
  in(filePath) {
    if (filePath.indexOf(this.config.rootDirectory) === 0) {
      filePath = _path.posix.join('$root', _path.posix.relative(this.config.rootDirectory, filePath));
    }
    return filePath;
  }
  out(filePath) {
    if (filePath.indexOf('$root') === 0) {
      filePath = _path.posix.join(this.config.rootDirectory, _path.posix.relative('$root', filePath));
    }
    return filePath;
  }
}
exports.default = Puth;
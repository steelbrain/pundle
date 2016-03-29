'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _resolve = require('resolve');

var _sbMemoize = require('sb-memoize');

var _sbMemoize2 = _interopRequireDefault(_sbMemoize);

var _sbPromisify = require('sb-promisify');

var _sbPromisify2 = _interopRequireDefault(_sbPromisify);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

var stat = (0, _sbPromisify2.default)(_fs2.default.stat, false);
var readFile = (0, _sbPromisify2.default)(_fs2.default.readFile);
var resolve = (0, _sbPromisify2.default)(require('resolve'), false);

class FileSystem {

  constructor(config) {
    this.config = config;
    this.resolve = (0, _sbMemoize2.default)(this._resolve, { async: true });
    this.resolveSync = (0, _sbMemoize2.default)(this._resolveSync);

    // NOTE: Share the cache between the two
    this.resolveSync.__sb_cache = this.resolve.__sb_cache;
  }
  stat(path) {
    return _asyncToGenerator(function* () {
      return yield stat(path);
    })();
  }
  readFile(path) {
    return _asyncToGenerator(function* () {
      return (yield readFile(path)).toString();
    })();
  }
  _resolve(moduleName, basedir) {
    return _asyncToGenerator(function* () {
      if ((0, _resolve.isCore)(moduleName)) {
        throw new Error('is core');
      }
      var path = yield resolve(moduleName, { basedir: basedir });
      if (path) {
        return path;
      }
      throw new Error('NPM install the module here for ' + moduleName + ' in ' + basedir);
    })();
  }
  _resolveSync(moduleName, basedir) {
    if ((0, _resolve.isCore)(moduleName)) {
      throw new Error('is core');
    }
    try {
      return (0, _resolve.sync)(moduleName, { basedir: basedir });
    } catch (_) {
      throw new Error('NPM install the module here for ' + moduleName + ' in ' + basedir);
    }
  }
  getResolvedPath(moduleName, basedir) {
    return this.resolve.__sb_cache[JSON.stringify([moduleName, basedir])];
  }
  clearCache() {
    this.resolve.__sb_cache = {};
  }
}
exports.default = FileSystem;
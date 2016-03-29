'use strict';
'use babel';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.normalizeConfig = normalizeConfig;
function normalizeConfig(givenConfig) {
  var config = Object.assign({}, givenConfig);
  if (!Array.isArray(config.entry)) {
    config.entry = [config.entry];
  }
  if (!config.FileSystem) {
    // TODO: Replace with a real filesystem
  }
  return config;
}
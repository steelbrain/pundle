'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = scan;

var _babelCore = require('babel-core');

var _helpers = require('../helpers');

function scan(filePath, content, state) {
  var imports = [];
  var parsed = (0, _babelCore.transform)(content, {
    plugins: [{
      visitor: {
        CallExpression: function CallExpression(path) {
          if (path.node.callee.name === 'require') {
            var argument = path.node.arguments[0];
            if (argument) {
              var resolved = (0, _helpers.getModulePath)(argument.value, filePath, state);
              argument.value = resolved;
              imports.push(resolved);
            }
          }
        },
        ImportDeclaration: function ImportDeclaration(path) {
          var resolved = (0, _helpers.getModulePath)(path.node.source.value, filePath, state);
          path.node.source.value = resolved;
          imports.push(resolved);
        }
      }
    }]
  });

  return {
    content: parsed.code,
    imports: imports
  };
}
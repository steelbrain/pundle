/* @flow */

// NOTE: We are spec incompiant in that we trigger module.hot.accept() callback for not just the specified clause
// But for all clauses
import type { ModuleNormal } from '../types'

const global = (typeof window !== 'undefined' && window) || (typeof self !== 'undefined' && self) || {}
const GLOBAL = global
const root = global

class __sbPundle_HMR {
  data: Object;
  accepts: Set<string> = new Set();
  declines: Set<string> = new Set();
  callbacks_accept: Set<Function> = new Set();
  callbacks_dispose: Set<Function> = new Set();
  constructor(data: Object = {}) {
    this.data = data
  }
  accept(...params) {
    for (let i = 0, length = params.length; i < length; i++) {
      const param = params[i]
      if (Array.isArray(param)) {
        this.accept(...params)
      } else if (typeof param === 'function') {
        this.callbacks_accept.add(param)
      } else if (typeof param === 'string') {
        this.accepts.add(param)
      } else {
        throw new Error('Unknown data type provided to module.hot.accept()')
      }
    }
    if (!params.length || !this.accepts.size) {
      this.accepts.add('*')
    }
  }
  decline(...params) {
    for (let i = 0, length = params.length; i < length; i++) {
      const param = params[i]
      if (Array.isArray(param)) {
        this.decline(...params)
      } else if (typeof param === 'string') {
        this.declines.add(param)
      } else {
        throw new Error('Unknown data type provided to module.hot.decline()')
      }
    }
    if (!params.length) {
      this.declines.add('*')
    }
  }
  dispose(callback: Function) {
    this.callbacks_dispose.add(callback)
  }
  addDisposeHandler(callback: Function) {
    this.callbacks_dispose.add(callback)
  }
  removeDisposeHandler(callback: Function) {
    this.callbacks_dispose.delete(callback)
  }
}

const __sbPundle = {
  defaultExport: {},
  cache: {},
  extensions: [],
  resolutionMap: {},
  resolve: function(path) {
    return path
  },
  getModule: function(moduleId, callback) {
    return {
      id: moduleId,
      hot: new __sbPundle_HMR(),
      callback: callback,
      exports: this.defaultExport,
      parents: [],
    }
  },
  registerMappings: function(mappings) {
    for (const key in mappings) {
      mappings[key].forEach(value => {
        this.resolutionMap[value] = key
      })
    }
  },
  registerModule: function(moduleId, callback) {
    if (this.cache[moduleId]) {
      this.cache[moduleId].callback = callback
    } else {
      this.cache[moduleId] = this.getModule(moduleId, callback)
    }
  },
  requireModule: function(fromModule: ?string, givenRequest: string) {
    const request = this.resolutionMap[givenRequest] || givenRequest
    const module: ?ModuleNormal = this.cache[request]
    if (!module) {
      throw new Error('Module not found')
    }
    if (fromModule && module.parents.indexOf(fromModule) === -1 && fromModule !== '$root') {
      module.parents.push(fromModule)
    }
    if (module.exports === this.defaultExport) {
      module.exports = {}
      module.callback.call(module.exports, module.id, '/', this.generateRequire(module.id), module, module.exports)
    }
    return module.exports
  },
  generateRequire: function(fromModule: ?string) {
    const require = this.requireModule.bind(this, fromModule)
    require.cache = this.cache
    require.extensions = this.extensions
    require.resolve = this.resolve
    return require
  },
  require: function(request: string) {
    return this.requireModule('$root', request)
  },
  /* eslint-disable */
  /**
   * Topological sorting function
   * @source https://github.com/marcelklehr/toposort/blob/de225fa7d55bb699dc927455ab0d1a3897d9d7b4/index.js
   * @license MIT
   */
  hmrSort: function(){function n(n,r){function e(f,u,d){if(d.indexOf(f)>=0)throw Error("Cyclic dependency: "+JSON.stringify(f));if(!~n.indexOf(f))throw Error("Found unknown node. Make sure to provided all involved nodes. Unknown node: "+JSON.stringify(f));if(!t[u]){t[u]=!0;var c=r.filter(function(n){return n[0]===f});if(u=c.length){var a=d.concat(f);do{var l=c[--u][1];e(l,n.indexOf(l),a)}while(u)}o[--i]=f}}for(var i=n.length,o=Array(i),t={},f=i;f--;)t[f]||e(n[f],f,[]);return o}function r(n){for(var r=[],e=0,i=n.length;i>e;e++){var o=n[e];r.indexOf(o[0])<0&&r.push(o[0]),r.indexOf(o[1])<0&&r.push(o[1])}return r}return function(e){return n(r(e),e)}}(),
  /**
   * Ansi helper utilities
   * For converting the CLI output into HTML
   * @source https://github.com/drudru/ansi_up/blob/32a3c2deb983579fe6149fba4938ce0f840d2afd/ansi_up.js
   * @license MIT
   */
   // $FlowIgnore
  AnsiToHTML: (function(){var t,r,o,n,e,u,c,i=[].slice;return r={ef0:"color:#000",ef1:"color:#A00",ef2:"color:#0A0",ef3:"color:#A50",ef4:"color:#00A",ef5:"color:#A0A",ef6:"color:#0AA",ef7:"color:#AAA",ef8:"color:#555",ef9:"color:#F55",ef10:"color:#5F5",ef11:"color:#FF5",ef12:"color:#55F",ef13:"color:#F5F",ef14:"color:#5FF",ef15:"color:#FFF",eb0:"background-color:#000",eb1:"background-color:#A00",eb2:"background-color:#0A0",eb3:"background-color:#A50",eb4:"background-color:#00A",eb5:"background-color:#A0A",eb6:"background-color:#0AA",eb7:"background-color:#AAA",eb8:"background-color:#555",eb9:"background-color:#F55",eb10:"background-color:#5F5",eb11:"background-color:#FF5",eb12:"background-color:#55F",eb13:"background-color:#F5F",eb14:"background-color:#5FF",eb15:"background-color:#FFF"},c=function(t){for(t=t.toString(16);t.length<2;)t="0"+t;return t},[0,1,2,3,4,5].forEach(function(t){return[0,1,2,3,4,5].forEach(function(o){return[0,1,2,3,4,5].forEach(function(n){var e,u,i,s,a,l;return u=16+36*t+6*o+n,a=t>0?40*t+55:0,i=o>0?40*o+55:0,e=n>0?40*n+55:0,l=function(){var t,r,o,n;for(o=[a,i,e],n=[],t=0,r=o.length;r>t;t++)s=o[t],n.push(c(s));return n}().join(""),r["ef"+u]="color:#"+l,r["eb"+u]="background-color:#"+l})})}),function(){for(u=[],e=0;23>=e;e++)u.push(e);return u}.apply(this).forEach(function(t){var o,n;return o=t+232,n=c(10*t+8),r["ef"+o]="color:#"+n+n+n,r["eb"+o]="background-color:#"+n+n+n}),n=function(){var t,r,o,n,e,u,c;for(t=arguments[0],u=2<=arguments.length?i.call(arguments,1):[],n=0,o=u.length;o>n;n++){e=u[n];for(r in e)c=e[r],t[r]=c}return t},o={fg:"#FFF",bg:"#000",newline:!0},t=function(){function t(t){null==t&&(t={}),this.opts=n({},o,t),this.input=[],this.stack=[],this.stickyStack=[]}return t.prototype.toHtml=function(t){var r;return this.input="string"==typeof t?[t]:t,r=[],this.stickyStack.forEach(function(t){return function(o){return t.generateOutput(o.token,o.data,function(t){return r.push(t)})}}(this)),this.forEach(function(t){return r.push(t)}),this.input=[],r.join("")},t.prototype.forEach=function(t){var r;return r="",this.input.forEach(function(o){return function(n){return r+=n,o.tokenize(r,function(r,n){return o.generateOutput(r,n,t)})}}(this)),this.stack.length?t(this.resetStyles()):void 0},t.prototype.generateOutput=function(t,r,o){switch(t){case"text":return o(r);case"display":return this.handleDisplay(r,o);case"xterm256":return o(this.pushStyle("ef"+r))}},t.prototype.updateStickyStack=function(t,r){var o;return o=function(t){return function(r){return(null===t||r.category!==t)&&"all"!==t}},"text"!==t?(this.stickyStack=this.stickyStack.filter(o(this.categoryForCode(r))),this.stickyStack.push({token:t,data:r,category:this.categoryForCode(r)})):void 0},t.prototype.handleDisplay=function(t,r){return t=parseInt(t,10),-1===t&&r("<br/>"),0===t&&this.stack.length&&r(this.resetStyles()),1===t&&r(this.pushTag("b")),3===t&&r(this.pushTag("i")),4===t&&r(this.pushTag("u")),t>4&&7>t&&r(this.pushTag("blink")),8===t&&r(this.pushStyle("display:none")),9===t&&r(this.pushTag("strike")),22===t&&r(this.closeTag("b")),23===t&&r(this.closeTag("i")),24===t&&r(this.closeTag("u")),t>29&&38>t&&r(this.pushStyle("ef"+(t-30))),39===t&&r(this.pushStyle("color:"+this.opts.fg)),t>39&&48>t&&r(this.pushStyle("eb"+(t-40))),49===t&&r(this.pushStyle("background-color:"+this.opts.bg)),t>89&&98>t&&r(this.pushStyle("ef"+(8+(t-90)))),t>99&&108>t?r(this.pushStyle("eb"+(8+(t-100)))):void 0},t.prototype.categoryForCode=function(t){return t=parseInt(t,10),0===t?"all":1===t?"bold":t>2&&5>t?"underline":t>4&&7>t?"blink":8===t?"hide":9===t?"strike":t>29&&38>t||39===t||t>89&&98>t?"foreground-color":t>39&&48>t||49===t||t>99&&108>t?"background-color":null},t.prototype.pushTag=function(t,o){return null==o&&(o=""),o.length&&-1===o.indexOf(":")&&(o=r[o]),this.stack.push(t),"<"+t+(o?' style="'+o+'"':void 0)+">"},t.prototype.pushStyle=function(t){return this.pushTag("span",t)},t.prototype.closeTag=function(t){var r;return this.stack.slice(-1)[0]===t&&(r=this.stack.pop()),null!=r?"</"+t+">":void 0},t.prototype.resetStyles=function(){var t,r;return t=[this.stack,[]],r=t[0],this.stack=t[1],r.reverse().map(function(t){return"</"+t+">"}).join("")},t.prototype.tokenize=function(t,r){var o,n,e,u,c,i,s,a,l,h,f,p,b,g,k;for(n=!1,o=3,p=function(t){return""},b=function(t,o){return r("xterm256",o),""},a=function(t){return function(o){return t.opts.newline?r("display",-1):r("text",o),""}}(this),e=function(t,o){var e,u,c;for(n=!0,0===o.trim().length&&(o="0"),o=o.trimRight(";").split(";"),c=0,u=o.length;u>c;c++)e=o[c],r("display",e);return""},f=function(t){return r("text",t),""},k=[{pattern:/^\x08+/,sub:p},{pattern:/^\x1b\[[012]?K/,sub:p},{pattern:/^\x1b\[38;5;(\d+)m/,sub:b},{pattern:/^\n/,sub:a},{pattern:/^\x1b\[((?:\d{1,3};?)+|)m/,sub:e},{pattern:/^\x1b\[?[\d;]{0,3}/,sub:p},{pattern:/^([^\x1b\x08\n]+)/,sub:f}],h=function(r,e){var u;e>o&&n||(n=!1,u=t.match(r.pattern),t=t.replace(r.pattern,r.sub))},g=[];(s=t.length)>0;){for(c=l=0,i=k.length;i>l;c=++l)u=k[c],h(u,c);if(t.length===s)break;g.push(void 0)}return g},t}()}()),
  /* eslint-enable */
  hmrIsAccepted: function(moduleId: string, matchAgainst: string = moduleId): 'no' | 'direct' | 'parent' {
    const module = this.cache[moduleId]
    if (module.hot.accepts.has('*') || module.hot.accepts.has(matchAgainst)) {
      return 'direct'
    }
    if (module.parents.some(i => this.hmrIsAccepted(i, matchAgainst) !== 'no')) {
      return 'parent'
    }
    return 'no'
  },
  hmrGetOrder: function(files: Array<string>): Array<string> {
    const input: Array<[string, string]> = []
    const added: Set<string> = new Set()
    const failed: Array<string> = []
    const duplicates: Array<[string, string]> = []
    const directUpdates: Array<string> = []

    const iterate = (from: string, parents: Array<string>) => {
      if (added.has(from)) {
        return
      }
      added.add(from)
      for (let i = 0, length = parents.length; i < length; ++i) {
        const parent = parents[i]
        if (added.has(parent)) {
          continue
        }
        const accepted = this.hmrIsAccepted(parent)
        if (accepted === 'no') {
          failed.push(parent)
          continue
        }

        const parentModule = this.cache[parent]
        if (added.has(`${from}-${parent}`) || added.has(`${parent}-${from}`)) {
          duplicates.push([from, parent])
          continue
        }
        added.add(`${from}-${parent}`)
        input.push([parent, from])
        if (accepted === 'parent' && parentModule.parents.length) {
          iterate(parent, parentModule.parents)
        }
      }
    }

    for (let i = 0, length = files.length; i < length; ++i) {
      const file = files[i]
      const updatedModule = this.cache[file]
      const accepted = this.hmrIsAccepted(file)
      if (accepted === 'no') {
        failed.push(file)
        continue
      }
      if (added.has(file) || (accepted === 'direct' && directUpdates.indexOf(file) !== -1)) {
        continue
      }
      if (accepted === 'direct') {
        directUpdates.push(file)
      } else if (accepted === 'parent' && updatedModule.parents.length) {
        iterate(file, updatedModule.parents)
      }
    }
    if (duplicates.length) {
      console.log('[HMR] Error: Update could not be applied because these modules require each other:\n' + duplicates.map(item => `  • ${item[0]} <--> ${item[0]}`).join('\n'))
      const error: Object = new Error('Unable to apply HMR because some modules require their parents')
      error.code = 'HMR_REBOOT_REQUIRED'
      throw error
    }
    if (failed.length) {
      console.log('[HMR] Error: Update could not be applied because these modules did not accept:\n' + failed.map(item => `  • ${item}`).join('\n'))
      const error: Object = new Error('Unable to apply HMR because some modules didnt accept it')
      error.code = 'HMR_REBOOT_REQUIRED'
      throw error
    }

    const sorted = this.hmrSort(input).reverse()
    for (let i = 0, length = directUpdates.length; i < length; i++) {
      const item = directUpdates[i]
      if (sorted.indexOf(item) === -1) {
        sorted.push(item)
      }
    }

    return sorted
  },
  hmrApply: function(files: Array<string>) {
    const updateOrder = this.hmrGetOrder(files)
    for (let i = 0, length = updateOrder.length; i < length; i++) {
      const file = updateOrder[i]
      const oldModule = this.cache[file]
      const newModule = this.getModule(oldModule.id, oldModule.callback)
      oldModule.hot.callbacks_dispose.forEach(function(callback) {
        callback(newModule.hot.data)
      })
      this.cache[file] = newModule
      newModule.parents = oldModule.parents
      try {
        newModule.callback.call(newModule.exports, newModule.id, '/', this.generateRequire(null), newModule, newModule.exports)
      } catch (error) {
        // NOTE: In case of error, copy last HMR info
        Object.assign(newModule.hot, {
          accepts: oldModule.hot.accepts,
          declines: oldModule.hot.declines,
          callbacks_accept: oldModule.hot.callbacks_accept,
          callbacks_dispose: oldModule.hot.callbacks_dispose,
        })
        throw error
      }
      newModule.hot.callbacks_accept.forEach(function(callback) {
        callback()
      })
    }
  },
}

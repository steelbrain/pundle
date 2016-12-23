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
  ansi: (function(r,t){function n(){this.fg=this.bg=this.fg_truecolor=this.bg_truecolor=null,this.bright=0}var o,s,l=("undefined"!=typeof module,[[{color:"0, 0, 0","class":"ansi-black"},{color:"187, 0, 0","class":"ansi-red"},{color:"0, 187, 0","class":"ansi-green"},{color:"187, 187, 0","class":"ansi-yellow"},{color:"0, 0, 187","class":"ansi-blue"},{color:"187, 0, 187","class":"ansi-magenta"},{color:"0, 187, 187","class":"ansi-cyan"},{color:"255,255,255","class":"ansi-white"}],[{color:"85, 85, 85","class":"ansi-bright-black"},{color:"255, 85, 85","class":"ansi-bright-red"},{color:"0, 255, 0","class":"ansi-bright-green"},{color:"255, 255, 85","class":"ansi-bright-yellow"},{color:"85, 85, 255","class":"ansi-bright-blue"},{color:"255, 85, 255","class":"ansi-bright-magenta"},{color:"85, 255, 255","class":"ansi-bright-cyan"},{color:"255, 255, 255","class":"ansi-bright-white"}]]);return n.prototype.setup_palette=function(){s=[],function(){var r,t;for(r=0;2>r;++r)for(t=0;8>t;++t)s.push(l[r][t].color)}(),function(){var r,t,n,o=[0,95,135,175,215,255],l=function(r,t,n){return o[r]+", "+o[t]+", "+o[n]};for(r=0;6>r;++r)for(t=0;6>t;++t)for(n=0;6>n;++n)s.push(l.call(this,r,t,n))}(),function(){var r,t=8,n=function(r){return r+", "+r+", "+r};for(r=0;24>r;++r,t+=10)s.push(n.call(this,t))}()},n.prototype.escape_for_html=function(r){return r.replace(/[&<>]/gm,function(r){return"&"==r?"&amp;":"<"==r?"&lt;":">"==r?"&gt;":t})},n.prototype.linkify=function(r){return r.replace(/(https?:\/\/[^\s]+)/gm,function(r){return'<a href="'+r+'">'+r+"</a>"})},n.prototype.ansi_to_html=function(r,t){return this.process(r,t,!0)},n.prototype.ansi_to_text=function(r){var t={};return this.process(r,t,!1)},n.prototype.process=function(r,t,n){var o=this,s=r.split(/\033\[/),l=s.shift(),e=s.map(function(r){return o.process_chunk(r,t,n)});return e.unshift(l),e.join("")},n.prototype.process_chunk=function(r,n,o){n=t===n?{}:n;var e=t!==n.use_classes&&n.use_classes,a=e?"class":"color",i=r.match(/^([!\x3c-\x3f]*)([\d;]*)([\x20-\x2c]*[\x40-\x7e])([\s\S]*)/m);if(!i)return r;var c=i[4],u=i[2].split(";");if(""!==i[1]||"m"!==i[3])return c;if(!o)return c;for(var f=this;u.length>0;){var g=u.shift(),h=parseInt(g);isNaN(h)||0===h?(f.fg=f.bg=null,f.bright=0):1===h?f.bright=1:39==h?f.fg=null:49==h?f.bg=null:h>=30&&38>h?f.fg=l[f.bright][h%10][a]:h>=90&&98>h?f.fg=l[1][h%10][a]:h>=40&&48>h?f.bg=l[0][h%10][a]:h>=100&&108>h?f.bg=l[1][h%10][a]:(38===h||48===h)&&!function(){var r=38===h;if(u.length>=1){var t=u.shift();if("5"===t&&u.length>=1){var n=parseInt(u.shift());if(n>=0&&255>=n)if(e){var o=n>=16?"ansi-palette-"+n:l[n>7?1:0][n%8]["class"];r?f.fg=o:f.bg=o}else s||f.setup_palette.call(f),r?f.fg=s[n]:f.bg=s[n]}else if("2"===t&&u.length>=3){var a=parseInt(u.shift()),i=parseInt(u.shift()),c=parseInt(u.shift());if(a>=0&&255>=a&&i>=0&&255>=i&&c>=0&&255>=c){var g=a+", "+i+", "+c;e?r?(f.fg="ansi-truecolor",f.fg_truecolor=g):(f.bg="ansi-truecolor",f.bg_truecolor=g):r?f.fg=g:f.bg=g}}}}()}if(null===f.fg&&null===f.bg)return c;var p=[],b=[],_={},v=function(r){var t,n=[];for(t in r)r.hasOwnProperty(t)&&n.push("data-"+t+'="'+this.escape_for_html(r[t])+'"');return n.length>0?" "+n.join(" "):""};return f.fg&&(e?(b.push(f.fg+"-fg"),null!==f.fg_truecolor&&(_["ansi-truecolor-fg"]=f.fg_truecolor,f.fg_truecolor=null)):p.push("color:rgb("+f.fg+")")),f.bg&&(e?(b.push(f.bg+"-bg"),null!==f.bg_truecolor&&(_["ansi-truecolor-bg"]=f.bg_truecolor,f.bg_truecolor=null)):p.push("background-color:rgb("+f.bg+")")),e?'<span class="'+b.join(" ")+'"'+v.call(f,_)+">"+c+"</span>":'<span style="'+p.join(";")+'"'+v.call(f,_)+">"+c+"</span>"},o={escape_for_html:function(r){var t=new n;return t.escape_for_html(r)},linkify:function(r){var t=new n;return t.linkify(r)},ansi_to_html:function(r,t){var o=new n;return o.ansi_to_html(r,t)},ansi_to_text:function(r){var t=new n;return t.ansi_to_text(r)},ansi_to_html_obj:function(){return new n}}})(Date),
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

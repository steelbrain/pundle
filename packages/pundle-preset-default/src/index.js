// @flow
/* eslint-disable global-require */

const BABEL_ALLOWED_VERSIONS = new Set([6, 7])
const DEFAULT_STATICS = [
  '.png',
  '.jpg',
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.eot',
  '.svg',
  '.webp',
  '.jpeg',
  '.gif',
  '.apng',
  '.bmp',
]

function getPresetComponents({
  report: { cli: reportCLI = true } = {},
  transform: {
    cson = false,
    css = true,
    coffee = false,
    json = true,
    json5 = false,
    babel = false,
    js = true,
    less = false,
    sass = false,
    stylus = false,
    postcss = false,
    typescript = false,
  } = {},
  development = process.env.NODE_ENV !== 'production',
  generate: { js: generateJS = true, css: generateCSS = true, html: generateHTML = true } = {},
  optimize: { js: optimizeJS = !development, css: optimizeCSS = !development, html: optimizeHTML = !development } = {},
  statics = [],
  resolve = true,
  target = 'browser',
}: {
  report?: {
    cli?: boolean,
  },
  transform?: {
    cson?: boolean,
    css?: boolean,
    coffee?: boolean,
    json?: boolean,
    json5?: boolean,
    babel?: 6 | 7 | false,
    js?: boolean | { env: { [string]: string } },
    less?: boolean,
    sass?: boolean,
    stylus?: boolean,
    postcss?: boolean,
    typescript?: boolean,
  },
  development?: boolean,
  generate?: {
    js?: boolean,
    csss?: boolean,
    html?: boolean,
  },
  optimize?: {
    js?: boolean,
    css?: boolean,
    html?: boolean,
  },
  statics?: Array<string>,
  resolve?: boolean | { aliases: Object },
  target: 'node' | 'browser',
}) {
  const components = []
  const extensions = {
    css: new Set(['.css']),
    js: new Set(['.js', '.mjs']),
  }

  if (reportCLI) {
    components.push(require('pundle-reporter-cli')())
  }
  if (cson) {
    extensions.js.add('.cson')
    components.push(require('pundle-transformer-cson')())
  }
  if (coffee) {
    extensions.js.add('.coffee')
    components.push(require('pundle-transformer-coffee')())
  }
  if (json) {
    extensions.js.add('.json')
    components.push(require('pundle-transformer-json')())
  }
  if (json5) {
    if (!json) {
      extensions.js.add('.json')
    }
    extensions.js.add('.json5')
    components.push(
      require('pundle-transformer-json5')({
        extensions: json ? ['.json5'] : ['.json', '.json5'],
      }),
    )
  }
  if (babel) {
    if (!BABEL_ALLOWED_VERSIONS.has(babel)) {
      throw new Error(
        `preset-default expects config.babel to be any of ${Array.from(BABEL_ALLOWED_VERSIONS).join(
          ', ',
        )} but got: ${babel} (type ${typeof babel})`,
      )
    }
    components.push(
      require('pundle-transformer-babel')({
        version: babel,
      }),
    )
  }
  if (less) {
    extensions.css.add('.less')
    components.push(require('pundle-transformer-less')())
  }
  if (sass) {
    extensions.css.add('.scss')
    components.push(require('pundle-transformer-sass')())
  }
  if (stylus) {
    extensions.css.add('.styl')
    components.push(require('pundle-transformer-stylus')())
  }
  if (postcss) {
    components.push(require('pundle-transformer-postcss')())
  }
  if (typescript) {
    extensions.js.add('.ts')
    extensions.js.add('.tsx')
    components.push(require('pundle-transformer-typescript')())
  }
  if (js) {
    components.push(
      require('pundle-transformer-js')({
        env: js && js.env ? js.env : {},
        browser: target === 'browser',
      }),
    )
  }
  components.push(
    require('pundle-transformer-static')({
      extensions: statics.concat(DEFAULT_STATICS),
    }),
  )
  if (css) {
    components.push(
      require('pundle-transformer-css')({
        development,
        extensions: Array.from(extensions.css),
      }),
    )
  }
  if (resolve) {
    const resolverAliases = {
      ...(target === 'browser' ? require('pundle-resolver-aliases-browser') : {}),
      ...(resolve && resolve.aliases ? resolve.aliases : {}),
    }
    components.push(
      require('pundle-resolver-default')({
        formats: {
          js: Array.from(extensions.js),
          css: Array.from(extensions.css),
          static: statics.concat(DEFAULT_STATICS),
          ...(generateHTML ? { html: ['.html'] } : {}),
        },
        aliases: resolverAliases,
      }),
    )
  }
  if (generateJS) {
    components.push(require('pundle-chunk-generator-js')())
  }
  if (generateCSS) {
    components.push(require('pundle-chunk-generator-css')())
  }
  if (generateHTML) {
    components.push(require('pundle-chunk-generator-html')())
  }
  components.push(require('pundle-chunk-generator-static')())
  if (optimizeJS) {
    components.push(require('pundle-job-transformer-js-common')())
    components.push(require('pundle-chunk-transformer-js-terser')())
  }
  if (optimizeCSS) {
    /* TODO: Implement css chunk transformer */
  }
  if (optimizeHTML) {
    /* TODO: Implement html chunk transformer */
  }

  return components
}

module.exports = getPresetComponents

// @flow

export function getDevelopmentContents(css: string): string {
  return `var cssContents = ${JSON.stringify(css)}
var cssElement = document.createElement('style')
cssElement.type = 'text/css'
cssElement.rel = 'stylesheet'
if (cssElement.styleSheet){
  cssElement.styleSheet.cssText = cssContents;
} else {
  cssElement.appendChild(document.createTextNode(cssContents));
}
if (document.head) {
  document.head.appendChild(cssElement)
} else {
  document.appendChild(cssElement)
}
if (process.env.NODE_ENV === 'development' && module.hot) {
  module.hot.accept()
  module.hot.addDisposeHandler(function() {
    cssElement.remove()
  })
}`
}

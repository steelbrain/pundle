// This is the entry file of the bundle

const content = 'Hello World'
const container = document.getElementById('app')

container.textContent = content

if (module.hot) {
  // Accept Hot Module Replacement
  module.hot.accept()
}

require('./App.css')

const root = document.getElementById('root')
root.textContent = 'Hello World'

// Enables HMR when in dev
if (process.env.NODE_ENV === 'development' && module.hot) {
  module.hot.accept()
}

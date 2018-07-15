import * as React from 'react'
import { render } from 'react-dom'
import App from './App'

const root = document.getElementById('root')

render(<App />, root)

// Enables HMR when in dev
if (process.env.NODE_ENV === 'development' && module.hot) {
  module.hot.accept()
}

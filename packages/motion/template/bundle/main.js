// @flow
import React from 'react'

export default class Main extends React.Component {
  state = { name: 'John Green' }
  render() {
    return (
      <h1>Hello World ~ ${this.state.name}</h1>
    )
  }
}

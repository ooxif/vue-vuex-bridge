import Vue from 'vue'
import bridge from '../'

Vue.config.errorHandler = function (err) {
  throw err
}

xtest('not-installed', () => {
  const options = bridge()({
    name: 'test',
    template: '<span />'
  })

  expect(() => new Vue(options)).toThrow(/\[vue-vuex-bridge]/)
})

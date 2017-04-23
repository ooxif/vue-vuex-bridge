# vue-vuex-bridge

[![Version](https://img.shields.io/npm/v/vue-vuex-bridge.svg)](https://www.npmjs.com/package/vue-vuex-bridge)
[![License](https://img.shields.io/npm/l/vue-vuex-bridge.svg)](https://www.npmjs.com/package/vue-vuex-bridge)
[![Build Status](https://travis-ci.org/ooxif/vue-vuex-bridge.svg)](https://travis-ci.org/ooxif/vue-vuex-bridge)
[![CircleCI Status](https://circleci.com/gh/ooxif/vue-vuex-bridge.svg?style=shield)](https://circleci.com/gh/ooxif/vue-vuex-bridge)
[![Coverage Status](https://img.shields.io/coveralls/ooxif/vue-vuex-bridge/master.svg)](https://coveralls.io/github/ooxif/vue-vuex-bridge?branch=master)
[![Code Climate Status](https://codeclimate.com/github/ooxif/vue-vuex-bridge.svg)](https://codeclimate.com/github/ooxif/vue-vuex-bridge)
[![Dependency Status](https://david-dm.org/ooxif/vue-vuex-bridge.svg)](https://david-dm.org/ooxif/vue-vuex-bridge)
[![devDependency Status](https://david-dm.org/ooxif/vue-vuex-bridge/dev-status.svg)](https://david-dm.org/ooxif/vue-vuex-bridge/?type=dev)
[![peerDependency Status](https://david-dm.org/ooxif/vue-vuex-bridge/peer-status.svg)](https://david-dm.org/ooxif/vue-vuex-bridge/?type=peer)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com)

Maps vuex store state to vue instances dynamically.

## usage

```javascript
import bridge from 'vue-vuex-bridge'

export default bridge({
  // bridge() registers 'bridge' module dynamically. 
  // [optional] [default: 'bridge']
  moduleName: 'bridge',

  // instance will have '$bridge' property for internal use.
  // [optional] [default: '$bridge']
  propName: '$bridge',

  state: {
    a: 1,
  },

  // key() must return a key for this vm.
  // key() is invoked at `beforeCreate` lifecycle.
  // the returned key is set to this.$bridge.
  // [optional] [default: 'default']
  key(vm) {
    return 'default'
  }
}, {
  // `name` must be set.
  name: 'sample-component',
  
  created() {
    // this.$store.state.bridge['sample-component'][this.$bridge].a
    this.a;
    
    // this.$store.commit('bridge/mutate', {
    //   componentName: 'sample-component',
    //   storeKey: this.$bridge,
    //   key: 'a',
    //   value: 2
    // })
    this.a = 2;
  }
})
```

## usage with beforeRouteEnter() (experimental)

```javascript
import bridge from 'vue-vuex-bridge'
import store from 'path/to/your/store'

const setting = bridge({
  state: { a: 1 }
})

export default setting({
  name: 'sample-component',
  
  beforeRouteEnter(to, from, next) {
    const { state, replace } = setting.getStore(store)
    
    state.a // 1
    
    // replace() uses store.commit() internally.
    replace({ a: 2 })
    
    state.a // 2
  },
  
  created() {
    this.a // 2
  }
})
```

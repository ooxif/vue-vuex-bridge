import Vue from 'vue'
import Vuex from 'vuex'
import bridge from '../'

Vue.use(Vuex)

Vue.config.errorHandler = function (err) {
  throw err
}

function toThrow (func) {
  expect(func).toThrow(/\[vue-vuex-bridge]/)
}

function toBe (actual, expected) {
  expect(actual).toBe(expected)
}

function isA (actual, expected) {
  expect(actual).toEqual(expect.any(expected))
}

function createStore (state) {
  return new Vuex.Store({
    state: state || {}
  })
}

test('no name', () => {
  toThrow(() => bridge()({}))
})

test('bridge() object', () => {
  const setting = bridge()

  isA(setting.getStore, Function)
  isA(setting.key, Function)
  isA(setting.moduleName, String)
  isA(setting.propName, String)
})

test('beforeCreate', () => {
  const beforeCreate = jest.fn()
  const store = createStore()
  const name = 'test'
  const setting = bridge({
    state: {
      foo: 100
    }
  })

  const vm = new Vue(setting({
    beforeCreate,
    name,
    store
  }))

  const key = setting.key()

  expect(beforeCreate).toBeCalled()
  toBe(vm[setting.propName], key)
  toBe(vm.foo, 100)

  isA(store.state[setting.moduleName], Object)
  toBe(store.getters[`${setting.moduleName}/installed`], true)

  isA(store.state[setting.moduleName][name], Object)
  isA(store.state[setting.moduleName][name][key], Object)
  toBe(store.state[setting.moduleName][name][key].foo, 100)

  vm.$destroy()

  toBe(store.state[setting.moduleName][name][key].foo, 100)
})

test('destroyed', () => {
  const store = createStore()
  const name = 'test'
  const setting = bridge({
    removeOnDestroy: true,
    state: {
      foo: 100
    }
  })

  const vm = new Vue(setting({
    name,
    store
  }))

  const key = setting.key()

  toBe(store.state[setting.moduleName][name][key].foo, 100)

  vm.$destroy()

  toBe(store.state[setting.moduleName][name][key], undefined)
})

test('setter', () => {
  const store = createStore()
  const name = 'test'
  const setting = bridge({
    state: {
      foo: 100
    }
  })

  const vm = new Vue(setting({
    name,
    store
  }))

  const key = setting.key()

  toBe(vm.foo, 100)
  toBe(store.state[setting.moduleName][name][key].foo, 100)

  vm.foo = 200

  toBe(vm.foo, 200)
  toBe(store.state[setting.moduleName][name][key].foo, 200)
})

test('key()', () => {
  const keyGenerator = jest.fn(() => 'generated-key')
  const store = createStore()
  const name = 'test'
  const setting = bridge({
    key: keyGenerator,
    state: {
      foo: 100
    }
  })

  const vm = new Vue(setting({
    name,
    store
  }))

  expect(keyGenerator).toBeCalled()

  const key = setting.key()

  toBe(key, 'generated-key')
  toBe(vm[setting.propName], key)
  toBe(store.state[setting.moduleName][name][key].foo, 100)
})

test('getStore()', () => {
  const store = createStore()
  const name = 'test'
  const setting = bridge({
    state: {
      foo: 100
    }
  })

  setting({ name })

  const key = setting.key()
  const map = setting.getStore(store)

  isA(store.state[setting.moduleName], Object)
  toBe(store.getters[`${setting.moduleName}/installed`], true)

  isA(store.state[setting.moduleName][name], Object)
  isA(store.state[setting.moduleName][name][key], Object)
  toBe(store.state[setting.moduleName][name][key].foo, 100)
  toBe(map.state.foo, 100)

  map.assign({ foo: 200 })

  toBe(store.state[setting.moduleName][name][key].foo, 200)
  toBe(map.state.foo, 200)
})

test('2 components * 2 instances', () => {
  const store = createStore()

  let counter = 0

  function key () {
    counter += 1

    return String(counter)
  }

  const name1 = 'test1'
  const setting1 = bridge({
    key,

    state: {
      foo: 100
    }
  })

  const vm11 = new Vue(setting1({
    store,
    name: name1
  }))

  isA(store.state[setting1.moduleName], Object)
  toBe(store.getters[`${setting1.moduleName}/installed`], true)

  const key11 = vm11[setting1.propName]

  toBe(vm11.foo, 100)
  toBe(store.state[setting1.moduleName][name1][key11].foo, 100)

  const vm12 = new Vue(setting1({
    store,
    name: name1
  }))

  const key12 = vm12[setting1.propName]

  expect(key12).not.toBe(key11)

  toBe(vm12.foo, 100)
  toBe(store.state[setting1.moduleName][name1][key12].foo, 100)

  vm11.foo = 101

  toBe(vm11.foo, 101)
  toBe(store.state[setting1.moduleName][name1][key11].foo, 101)
  toBe(vm12.foo, 100)
  toBe(store.state[setting1.moduleName][name1][key12].foo, 100)

  const name2 = 'test2'
  const setting2 = bridge({
    key,

    state: {
      foo: 200
    }
  })

  const vm21 = new Vue(setting2({
    store,
    name: name2
  }))

  const key21 = vm21[setting2.propName]

  toBe(vm21.foo, 200)
  toBe(store.state[setting2.moduleName][name2][key21].foo, 200)

  const vm22 = new Vue(setting2({
    store,
    name: name2
  }))

  const key22 = vm22[setting2.propName]

  expect(key22).not.toBe(key21)

  toBe(vm22.foo, 200)
  toBe(store.state[setting2.moduleName][name2][key22].foo, 200)

  vm21.foo = 201

  toBe(vm21.foo, 201)
  toBe(store.state[setting2.moduleName][name2][key21].foo, 201)
  toBe(vm22.foo, 200)
  toBe(store.state[setting2.moduleName][name2][key22].foo, 200)
})

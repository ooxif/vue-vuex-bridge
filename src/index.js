const PROP_NAME = '$bridge'
const MODULE_NAME = 'bridge'

function generateKey (vm, keyGenerator) {
  if (!keyGenerator) return 'default'

  const generatedKey = keyGenerator(vm)

  if (process.env.NODE_ENV !== 'production') {
    if (typeof generatedKey !== 'string' || generatedKey === '') {
      // eslint-disable-next-line no-console
      console.error('Generated key is not valid.', vm)

      return 'default'
    }
  }

  return generatedKey
}

function createStateProxy (moduleName, componentName, propName, key) {
  return {
    cache: process.env.VUE_ENV !== 'server',

    get () {
      return this.$store.state[moduleName][componentName][this[propName]][key]
    },

    set (value) {
      this.$store.commit(`${moduleName}/mutate`, {
        componentName,
        key,
        value,
        storeKey: this[propName]
      })
    }
  }
}

function transformState (moduleName, componentName, propName, keys) {
  const computed = {}

  for (let i = 0, len = keys.length; i < len; i += 1) {
    const key = keys[i]

    computed[key] = createStateProxy(moduleName, componentName, propName, key)
  }

  return computed
}

function registerModule (store, moduleName) {
  store.registerModule(moduleName, {
    namespaced: true,

    state: store.state[moduleName] || {},

    getters: {
      installed: () => true
    },

    mutations: {
      initialize (state, { componentName, set, storeKey, value }) {
        if (!(componentName in state)) {
          set(state, componentName, { [storeKey]: value })
        } else {
          set(state[componentName], storeKey, value)
        }
      },

      replace (state, { componentName, storeKey, value }) {
        state[componentName][storeKey] = value
      },

      mutate (state, { componentName, storeKey, key, value }) {
        state[componentName][storeKey][key] = value
      }
    }
  })
}

export default function bridge (options) {
  const opts = options || {}
  const moduleName = opts.moduleName || MODULE_NAME
  const propName = opts.propName || PROP_NAME
  const componentState = opts.state || {}
  const removeOnDestroy = !!opts.removeOnDestroy
  let componentName
  let keyGenerator

  function initState (store, storeKey) {
    if (!store.getters[`${moduleName}/installed`]) registerModule(store, moduleName)

    const { state } = store

    const moduleState = state[moduleName]
    const stateMap = moduleState && moduleState[componentName]

    if (!stateMap || !(storeKey in stateMap)) {
      store.commit(`${moduleName}/initialize`, {
        componentName,
        storeKey,
        set: store._vm.$set, // eslint-disable-line no-underscore-dangle
        value: { ...componentState }
      })
    }
  }

  const func = function transformComponentOptions (componentOptions) {
    const {
      beforeCreate,
      computed,
      destroyed,
      name
    } = componentOptions

    if (!name) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.error('name must be set.', componentOptions)
      }

      return componentOptions
    }

    componentName = name
    keyGenerator = componentOptions.key

    componentOptions.computed = {
      ...(computed || {}),
      ...transformState(moduleName, componentName, propName, Object.keys(componentState))
    }

    componentOptions.beforeCreate = function beforeCreateHook () {
      const { $store } = this

      if ($store) {
        const storeKey = generateKey(this, keyGenerator)

        if (storeKey) {
          initState($store, storeKey)
          this[propName] = storeKey
        }
      } else if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.error('this.$store must be set.', componentOptions)
      }

      if (beforeCreate) beforeCreate.call(this)
    }

    if (removeOnDestroy) {
      componentOptions.destroyed = function destroyedHook () {
        const storeKey = this[propName]

        if (storeKey) {
          this.$delete(this.$store.state[moduleName][componentName], storeKey)
        }

        if (destroyed) destroyed.call(this)
      }
    }

    return componentOptions
  }

  func.getStore = function getStore (store) {
    const storeKey = generateKey(this, keyGenerator)

    if (!storeKey) return null

    initState(store, storeKey)

    return {
      replace (newState) {
        store.commit(`${moduleName}/replace`, {
          componentName,
          storeKey,
          value: newState
        })
      },

      state: store.state[moduleName][componentName][storeKey]
    }
  }

  return func
}

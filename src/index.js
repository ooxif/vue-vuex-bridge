const DEFAULT_KEY = 'default'
const MODULE_NAME = 'bridge'
const PROP_NAME = '$bridge'

function raise (message) {
  throw new Error(`[vue-vuex-bridge] ${message}`)
}

function getDefaultKey () {
  return DEFAULT_KEY
}

function generateKey (vm, keyGenerator) {
  const generatedKey = keyGenerator(vm)

  typeof generatedKey !== 'string' && raise(
    `key() returned an invalid value (typeof ${typeof generatedKey})`
  )

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

    state: Object.assign(
      Object.create(null),
      store.state[moduleName] || {}
    ),

    getters: {
      installed () {
        return true
      }
    },

    mutations: {
      assign (state, payload) {
        const prevState = state[payload.componentName][payload.storeKey]
        const { values } = payload
        const keys = Object.keys(values)
        const { length } = keys

        for (let i = 0; i < length; i += 1) {
          const key = keys[i]

          if (key in prevState) {
            prevState[key] = values[key]
          }
        }
      },

      initialize (state, { componentName, set, storeKey, value }) {
        if (!(componentName in state)) {
          set(state, componentName, { [storeKey]: value })
        } else {
          set(state[componentName], storeKey, value)
        }
      },

      mutate (state, pl) {
        state[pl.componentName][pl.storeKey][pl.key] = pl.value
      }
    }
  })
}

export default function bridge (options = {}) {
  const moduleName = options.moduleName || MODULE_NAME
  const propName = options.propName || PROP_NAME
  const componentState = options.state || {}
  const keyGenerator = options.key || getDefaultKey
  const removeOnDestroy = !!options.removeOnDestroy
  let componentName

  function initState (store, storeKey) {
    if (!store.getters[`${moduleName}/installed`]) {
      registerModule(store, moduleName)
    }

    const { state } = store

    const moduleState = state[moduleName]
    const stateMap = moduleState && moduleState[componentName]

    if (!stateMap || !(storeKey in stateMap)) {
      store.commit(`${moduleName}/initialize`, {
        componentName,
        storeKey,
        set: store._vm.$set,
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

    !name && raise('name must be set')

    componentName = name

    componentOptions.computed = {
      ...(computed || {}),
      ...transformState(
        moduleName,
        componentName,
        propName,
        Object.keys(componentState)
      )
    }

    componentOptions.beforeCreate = function beforeCreateHook () {
      const { $store } = this

      !$store && raise('Vuex is not installed')

      const storeKey = generateKey(this, keyGenerator)

      initState($store, storeKey)

      Object.defineProperty(this, propName, {
        __proto__: null,
        value: storeKey
      })

      beforeCreate && beforeCreate.call(this)
    }

    if (removeOnDestroy) {
      componentOptions.destroyed = function destroyedHook () {
        const storeKey = this[propName]

        this.$delete(this.$store.state[moduleName][componentName], storeKey)

        destroyed && destroyed.call(this)
      }
    }

    return componentOptions
  }

  func.getStore = function getStore (store) {
    const storeKey = generateKey(this, keyGenerator)

    initState(store, storeKey)

    return {
      assign (values) {
        store.commit(`${moduleName}/assign`, {
          values,
          componentName,
          storeKey
        })
      },

      state: store.state[moduleName][componentName][storeKey]
    }
  }

  func.key = keyGenerator
  func.moduleName = moduleName
  func.propName = propName

  return func
}

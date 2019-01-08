import { createStore as _createStore } from 'redux';
import {
  createReducer as _createReducer,
  getId,
  getGetter,
} from '@artalar/tr-reducer';

const prefix = '@@tr-redux/';
// const generateUid =
//   typeof Symbol === 'function'
//     ? description => Symbol(prefix + description)
//     : description => `${prefix + description}__${Math.random()}`;

const INITIATE_REDUCERS = `${prefix}INITIATE_REDUCERS`;

function performReducer(reducer, preloadedState) {
  const context = {
    state: Object.create(null),
    cache: Object.create(null),
    changedIds: [],
  };
  const buildedReducer = reducer.build();

  context.state[getId(reducer)] = preloadedState;

  function performedReducer(state, action) {
    context.cache = Object.create(null);
    context.changedIds = [];
    try {
      state = buildedReducer(context, action);
      context.state = Object.assign({}, context.state, context.cache);
      context.state = { ...context.state, ...context.cache };
    } catch (e) {
      context.changedIds = [];
      throw e;
    } finally {
      context.cache = Object.create(null);
    }
    return state;
  }

  performedReducer(undefined, { type: INITIATE_REDUCERS });

  return {
    context,
    performedReducer,
  };
}

export function createReducer(initialState) {
  return _createReducer(initialState).on(
    INITIATE_REDUCERS,
    (state = initialState) => state,
  );
}

export function createStore(reducer, preloadedState, enhancer) {
  const { context, performedReducer } = performReducer(reducer, preloadedState);
  const store = _createStore(performedReducer, preloadedState, enhancer);
  const subscribers = Object.create(null);
  const subscribersToLenses = Object.create(null);
  const getters = Object.create(null);

  store.subscribe(() => {
    const { changedIds, state } = context;
    context.changedIds = [];

    for (let i = 0; i < changedIds.length; i++) {
      const item = changedIds[i];
      if (typeof item === 'object') {
        const { id, key } = item;
        const get = getters[id];
        if (id in subscribers) {
          const newValue = state[id];
          subscribers[id].forEach(s => s(newValue));
        }
        if (id in subscribersToLenses) {
          if (key in subscribersToLenses[id]) {
            const newValue = get(state[id], key);
            subscribersToLenses[id][key].forEach(s => s(newValue));
          }
        }
      } else if (item in subscribers) {
        const newValue = state[item];
        subscribers[item].forEach(s => s(newValue));
        if (item in subscribersToLenses) {
          const get = getters[item];
          // eslint-disable-next-line
          for (const key in subscribersToLenses[item]) {
            const newItemValue = get(state[item], key);
            subscribersToLenses[item][key].forEach(s => s(newItemValue));
          }
        }
      }
    }
  });

  store.subscribe = function subscribe(listener, target = reducer, key) {
    const targetId = getId(target);
    getters[targetId] = getGetter(target);

    if (arguments.length === 3) {
      if (!(targetId in subscribersToLenses)) {
        subscribersToLenses[targetId] = Object.create(null);
      }
      if (!(key in subscribersToLenses[targetId])) {
        subscribersToLenses[targetId][key] = new Set();
      }

      subscribersToLenses[targetId][key].add(listener);
      return function unsubscribe() {
        subscribersToLenses[targetId][key] = new Set(
          subscribersToLenses[targetId][key],
        );
        subscribersToLenses[targetId][key].delete(listener);
      };
    }

    if (!(targetId in subscribers)) {
      subscribers[targetId] = new Set();
    }

    subscribers[targetId].add(listener);
    return function unsubscribe() {
      subscribers[targetId] = new Set(subscribers[targetId]);
      subscribers[targetId].delete(listener);
    };
  };

  store.getState = function getState(target = reducer) {
    return context.state[getId(target)];
  };

  return store;
}

import { applyMiddleware, __DO_NOT_USE__ActionTypes } from 'redux';
import {
  createReducer as _createReducer,
  getId,
  getGetter,
} from '@artalar/tr-reducer';

export function createReducer(initialState) {
  return _createReducer(initialState).on(
    __DO_NOT_USE__ActionTypes.INIT,
    (state = initialState) => state,
  );
}

export function composeEnhancers(...middlewares) {
  return createStore => (rootReducer, preloadedState) => {
    const store = preloadedState
      ? createStore(
          rootReducer,
          preloadedState,
          applyMiddleware(...middlewares),
        )
      : createStore(rootReducer, applyMiddleware(...middlewares));
    console.log(store.getState());

    // `changes[0]` filled by INIT action
    const rootId = store.getState().changes[0];
    const subscribers = Object.create(null);
    const subscribersToLenses = Object.create(null);
    const getters = Object.create(null);

    store.subscribe(() => {
      const { changes, flat } = store.getState();

      for (let i = 0; i < changes.length; i++) {
        const item = changes[i];
        if (typeof item === 'object') {
          const { id, key } = item;
          const get = getters[id];
          if (id in subscribers) {
            const newValue = flat[id];
            subscribers[id].forEach(s => s(newValue));
          }
          if (id in subscribersToLenses) {
            if (key in subscribersToLenses[id]) {
              const newValue = get(flat[id], key);
              subscribersToLenses[id][key].forEach(s => s(newValue));
            }
          }
        } else if (item in subscribers) {
          const newValue = flat[item];
          subscribers[item].forEach(s => s(newValue));
          if (item in subscribersToLenses) {
            const get = getters[item];
            // eslint-disable-next-line
            for (const key in subscribersToLenses[item]) {
              const newItemValue = get(flat[item], key);
              subscribersToLenses[item][key].forEach(s => s(newItemValue));
            }
          }
        }
      }
    });

    function subscribe(listener, target = rootReducer, key) {
      const targetId = getId(target);

      if (targetId === undefined) {
        throw new TypeError('Target is not "tr-reducer"');
      }

      getters[targetId] = getGetter(target);

      if (key !== undefined) {
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
    }

    function getState(target, key) {
      if (target === undefined) {
        return store.getState().root;
      }
      if (key === undefined) {
        return store.getState().flat[getId(target)];
      }
      return getGetter(target)(store.getState().flat[getId(target)], key);
    }

    return {
      ...store,
      subscribe,
      getState,
    };
  };
}

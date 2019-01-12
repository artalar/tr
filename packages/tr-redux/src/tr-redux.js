// eslint-disable-next-line camelcase
import { applyMiddleware, __DO_NOT_USE__ActionTypes } from 'redux';
import {
  createCollection as _createCollection,
  __getId,
} from '@artalar/tr-reducer';

export { tellChanges } from '@artalar/tr-reducer';

export function createCollection(initialState, description) {
  return _createCollection(initialState, description).on(
    __DO_NOT_USE__ActionTypes.INIT,
    (state = initialState) => state,
  );
}

export function composeEnhancers(...middlewares) {
  return createStore => (rootReducer, preloadedState) => {
    const store = preloadedState
      ? createStore(
          rootReducer.build(),
          preloadedState,
          applyMiddleware(...middlewares),
        )
      : createStore(rootReducer.build(), applyMiddleware(...middlewares));

    const subscribers = Object.create(null);
    const subscribersByIdByKeys = Object.create(null);

    store.subscribe(() => {
      const { changes, flat } = store.getState();

      const changedIds = Object.keys(changes);
      for (let i = 0; i < changedIds.length; i++) {
        const changedId = changedIds[i];
        const newValue = flat[changedId];

        if (changedId in subscribers) {
          subscribers[changedId].forEach(s => s(newValue));
        }

        if (changedId in subscribersByIdByKeys) {
          const subscribersByKeys = subscribersByIdByKeys[changedId];
          const changedKeys =
            changes[changedId].length === 0
              ? Object.keys(subscribersByKeys)
              : changes[changedId];

          for (
            let changedKeyIndex = 0;
            changedKeyIndex < changedKeys.length;
            changedKeyIndex++
          ) {
            const changedKey = changedKeys[changedKeyIndex];

            if (changedKey in subscribersByKeys) {
              subscribersByKeys[changedKey].forEach(s => s(newValue));
            }
          }
        }
      }
    });

    function subscribe(listener, target = rootReducer, key) {
      const targetId = __getId(target);

      if (targetId === undefined) {
        throw new TypeError('Target is not "tr-reducer"');
      }

      if (key !== undefined) {
        if (!(targetId in subscribersByIdByKeys)) {
          subscribersByIdByKeys[targetId] = Object.create(null);
        }
        if (!(key in subscribersByIdByKeys[targetId])) {
          subscribersByIdByKeys[targetId][key] = new Set();
        }

        subscribersByIdByKeys[targetId][key].add(listener);
        return function unsubscribe() {
          subscribersByIdByKeys[targetId][key] = new Set(
            subscribersByIdByKeys[targetId][key],
          );
          subscribersByIdByKeys[targetId][key].delete(listener);
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

    function getState(target) {
      if (target === undefined) {
        return store.getState();
      }
      return store.getState().flat[__getId(target)];
    }

    return {
      ...store,
      subscribe,
      getState,
    };
  };
}

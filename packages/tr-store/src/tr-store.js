/**
 * TODO: error descriptions
 */

import $$observable from 'symbol-observable';
import { getId } from '@artalar/tr-reducer';

import ActionTypes from './utils/actionTypes';

export { createReducer } from '@artalar/tr-reducer';

export function createStore(reducer, preloadedState, enhancer) {
  if (
    (typeof preloadedState === 'function' && typeof enhancer === 'function') ||
    (typeof enhancer === 'function' && typeof arguments[3] === 'function')
  ) {
    throw new Error(
      'It looks like you are passing several store enhancers to ' +
        'createStore(). This is not supported. Instead, compose them ' +
        'together to a single function',
    );
  }

  if (typeof preloadedState === 'function' && typeof enhancer === 'undefined') {
    enhancer = preloadedState;
    preloadedState = undefined;
  }

  if (typeof enhancer !== 'undefined') {
    if (typeof enhancer !== 'function') {
      throw new Error('Expected the enhancer to be a function.');
    }

    return enhancer(createStore)(reducer, preloadedState);
  }

  if (typeof reducer !== 'function') {
    throw new Error('Expected the reducer to be a function.');
  }

  const context = {
    cache: Object.create(null),
    state: Object.create(null),
    changedIds: [],
  };
  const subscribers = Object.create(null);
  let currentReducer = reducer.build();
  let state = preloadedState;

  function getState() {
    return state;
  }

  function dispatch(action) {
    const { cache, changedIds } = context;
    try {
      state = currentReducer(getState(), action, context);
      context.state = Object.assign({}, context.state, context.cache);
    } finally {
      context.cache = Object.create(null);
      context.changedIds = [];
    }
    for (let i = 0; i < changedIds.length; i++) {
      const id = changedIds[i];
      if (id in subscribers) {
        const newValues = cache[id];
        subscribers[id].forEach(s => s(newValues));
      }
    }
    return action;
  }

  function subscribe(listener, target = currentReducer) {
    const id = getId(target);
    if (!(id in subscribers)) {
      subscribers[id] = new Set();
    }
    const relativeSubscribers = subscriberssubscribers[id];

    relativeSubscribers.add(listener);
    return () => {
      relativeSubscribers.delete(listener);
      subscribers[id] = new Set(relativeSubscribers);
    };
  }

  function replaceReducer(nextReducer) {
    if (typeof nextReducer !== 'function') {
      throw new Error('Expected the nextReducer to be a function.');
    }

    currentReducer = nextReducer;
    dispatch({ type: ActionTypes.REPLACE });
  }

  function observable() {
    const outerSubscribe = subscribe;
    return {
      /**
       * The minimal observable subscription method.
       * @param {Object} observer Any object that can be used as an observer.
       * The observer object should have a `next` method.
       * @returns {subscription} An object with an `unsubscribe` method that can
       * be used to unsubscribe the observable from the store, and prevent further
       * emission of values from the observable.
       */
      subscribe(observer) {
        if (typeof observer !== 'object' || observer === null) {
          throw new TypeError('Expected the observer to be an object.');
        }

        function observeState() {
          if (observer.next) {
            observer.next(getState());
          }
        }

        observeState();
        const unsubscribe = outerSubscribe(observeState);
        return { unsubscribe };
      },

      [$$observable]() {
        return this;
      },
    };
  }

  dispatch({ type: INITIAL_ACTION });

  return {
    getState,
    dispatch,
    subscribe,
    replaceReducer,
    [$$observable]: observable,
  };
}

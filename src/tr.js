/**
 * TODO: error descriptions
 */

import $$observable from 'symbol-observable';

import ActionTypes from './utils/actionTypes';

const _Symbol =
  typeof Symbol === 'function'
    ? Symbol
    : name =>
        name +
        Math.random()
          .toString(36)
          .substring(7)
          .split('')
          .join('.');

function generateUid(name) {
  return _Symbol(name);
}

const ID = generateUid('@@tr/createReducer/ID');
const DEPS_HANDLERS_LIST = generateUid('@@tr/createReducer/DEPS_HANDLERS_LIST');
const IS_DONE = generateUid('@@tr/createReducer/IS_DONE');

function noop() {}

export function createReducer(initialState) {
  const id = generateUid('@@tr/createReducer/id');
  // "dep*" - dependency
  const depsHandlersList = Object.create(null);
  const depsHandlers = Object.create(null);

  reducer[ID] = id;
  reducer[DEPS_HANDLERS_LIST] = depsHandlersList;

  function reducer(state, action, context) {
    if (action.type in depsHandlers) {
      if (context === undefined) throw new TypeError();
      depsHandlers[action.type](context, action);
      return context.cache[id];
    }
    return state;
  }

  reducer.on = function on(actionType, mapper) {
    if (typeof mapper !== 'function') throw new TypeError();

    const handler = (context, action) => {
      context.cache[id] = mapper(
        id in context.state ? context.state[id] : initialState,
        action.payload,
      );
    };
    if (!(actionType in depsHandlersList)) {
      depsHandlersList[actionType] = new Set();
    }
    depsHandlersList[actionType].add(handler);

    return reducer;
  };

  reducer.compute = function compute(...args) {
    const mapper = args.pop();
    const deps = args;
    const dependedActionTypesList = [];

    for (let i = 0; i < deps.length; i++) {
      if (!deps[i][ID]) throw new TypeError();
      if (!deps[i][IS_DONE]) throw new Error();
    }

    for (let i = 0; i < deps.length; i++) {
      const depDepsHandlers = deps[i][DEPS_HANDLERS_LIST];
      for (const depActionType in depDepsHandlers) {
        if (dependedActionTypesList.indexOf(depActionType) === -1) {
          dependedActionTypesList.push(depActionType);
        }

        if (!(depActionType in depsHandlersList)) {
          depsHandlersList[depActionType] = new Set();
        }
        depDepsHandlers[depActionType].forEach(handler =>
          depsHandlersList[depActionType].add(handler),
        );
      }
    }

    for (let i = 0; i < dependedActionTypesList.length; i++) {
      depsHandlersList[dependedActionTypesList[i]].add(context => {
        const { cache, state } = context;
        cache[id] = mapper(
          state[id],
          ...deps.map(({ [ID]: depId }) =>
            depId in cache ? cache[depId] : state[depId],
          ),
        );
      });
    }

    return reducer;
  };

  reducer.done = function done() {
    for (const actionType in depsHandlersList) {
      let resultHandler = noop;
      depsHandlersList[actionType].forEach(handler => {
        const previousHandler = resultHandler;
        resultHandler = (context, action) => {
          previousHandler(context, action);
          handler(context, action);
        };
      });
      depsHandlers[actionType] = resultHandler;
    }
    reducer.on = reducer.compute = () => {
      throw new Error();
    };
    reducer[IS_DONE] = true;

    return reducer;
  };

  return reducer;
}

export function combineReducers(reducers) {
  const reducerKeys = Object.keys(reducers);
  if (reducerKeys.some(name => !reducers[name][ID])) {
    const finalReducers = {};
    for (let i = 0; i < reducerKeys.length; i++) {
      const key = reducerKeys[i];

      if (typeof reducers[key] === 'function') {
        finalReducers[key] = reducers[key];
      }
    }
    const finalReducerKeys = Object.keys(finalReducers);

    let unexpectedKeyCache;
    if (process.env.NODE_ENV !== 'production') {
      unexpectedKeyCache = {};
    }

    return function combination(state = {}, action) {
      let hasChanged = false;
      const nextState = {};
      for (let i = 0; i < finalReducerKeys.length; i++) {
        const key = finalReducerKeys[i];
        const reducer = finalReducers[key];
        const previousStateForKey = state[key];
        const nextStateForKey = reducer(previousStateForKey, action);
        if (typeof nextStateForKey === 'undefined') {
          throw new Error(errorMessage);
        }
        nextState[key] = nextStateForKey;
        hasChanged = hasChanged || nextStateForKey !== previousStateForKey;
      }
      return hasChanged ? nextState : state;
    };
  }
  return createReducer({})
    .compute(
      ...reducerKeys
        .map(name => reducers[name])
        .concat((...reducersResult) =>
          reducerKeys.reduce(
            (acc, name, i) => Object.assign(acc, { [name]: reducersResult[i] }),
            {},
          ),
        ),
    )
    .done();
}

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

  const context = { cache: Object.create(null), state: Object.create(null) };
  const subscribers = new Map();
  let currentReducer = reducer;
  let state = preloadedState;

  function getState() {
    return state;
  }

  function dispatch(action) {
    const { cache } = context;
    try {
      state = currentReducer(getState(), action, context);
      context.state = Object.assign(context.state, context.cache);
    } finally {
      context.cache = Object.create(null);
    }
    // TODO: improve
    for (let [id, relativeSubscribers] of subscribers) {
      if (id in cache) {
        relativeSubscribers.forEach(s => s(cache[id]));
      }
    }
    return action;
  }

  function subscribe(listener, target = currentReducer) {
    const id = target[ID];
    if (!subscribers.has(id)) {
      subscribers.set(id, new Set());
    }
    const relativeSubscribers = subscribers.get(id);
    relativeSubscribers.add(listener);
    return () => {
      relativeSubscribers.delete(listener);
      subscribers.set(id, new Set(relativeSubscribers));
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

  dispatch({ type: ActionTypes.INIT });

  return {
    getState,
    dispatch,
    subscribe,
    replaceReducer,
    [$$observable]: observable,
  };
}

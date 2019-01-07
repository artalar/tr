import { createStore as _createStore } from 'redux';
import { createReducer as _createReducer, getId } from '@artalar/tr-reducer';

const prefix = '@@tr-redux/';
const generateUid =
  typeof Symbol === 'function'
    ? description => Symbol(prefix + description)
    : description => prefix + description + '__' + Math.random();

export const CONTEXT_KEY = generateUid('CONTEXT_KEY');
const INITIATE_REDUCERS = prefix + 'INITIATE_REDUCERS';

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
    state = buildedReducer(context, action);
    context.state = Object.assign({}, context.state, context.cache);
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
  store[CONTEXT_KEY] = context;
  return store;
}

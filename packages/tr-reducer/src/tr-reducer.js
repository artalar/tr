/**
 * TODO: error descriptions
 */

const _Symbol =
  typeof Symbol !== 'undefined'
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

const isValidState = state =>
  Boolean(state && state.flat !== null && typeof state.flat === 'object');
const isValidAction = action => Boolean(action && action.type);

const ID = generateUid('@@tr/createReducer/ID');
const DEPS_HANDLERS_LIST = generateUid('@@tr/createReducer/DEPS_HANDLERS_LIST');
const IS_DONE = generateUid('@@tr/createReducer/IS_DONE');
const GETTER = generateUid('@@tr/createReducer/GETTER');

function noop() {}

class OwnError extends Error {
  constructor(msg = '') {
    super(`@@tg-reducer/${msg}`);
  }
}

const defaultLense = {
  get: (state, itemId) => state[itemId],
  set: (state, itemId, value) => {
    const newState = Array.isArray(state) ? state.slice(0) : { ...state };
    newState[itemId] = value;
    return newState;
  },
};

export function getId(reducer) {
  return reducer[ID];
}

export function getGetter(reducer) {
  return reducer[GETTER];
}

export function createReducer(defaultValue, { get, set } = defaultLense) {
  const id = generateUid('@@tr/createReducer/id');
  // "dep*" - dependency
  const handlersByDependency = Object.create(null);
  let isDone = false;

  const builder = {
    [ID]: id,
    [DEPS_HANDLERS_LIST]: handlersByDependency,
    [GETTER]: get,
    on(...args) {
      const actionType = args.shift();
      const mapper = args.pop();
      const deps = args;

      if (isDone) {
        throw new OwnError(
          'Reducer is "done" - dependencies locked and can not be changed',
        );
      }
      if (typeof actionType !== 'string') {
        throw new OwnError('The action type is must be a string');
      }
      if (typeof mapper !== 'function') {
        throw new OwnError('The mapper is must be a function');
      }
      for (let i = 0; i < deps.length; i++) {
        if (!deps[i][ID]) {
          throw new OwnError(
            'Computed dependencies can be only the others reducers',
          );
        }
        if (!deps[i][IS_DONE]) {
          throw new OwnError(`Dependency №${i + 1} is not "done"`);
        }
      }

      const handler = ({ flatNew, flatOld, changes }, action) => {
        const isCacheExist = id in flatNew;
        let isFirstHandle = false;
        let previousValue;
        if (isCacheExist) {
          previousValue = flatNew[id];
        } else if (id in flatOld) {
          previousValue = flatOld[id];
        } else {
          previousValue = defaultValue;
          isFirstHandle = true;
        }

        const newValue = mapper(
          previousValue,
          action.payload,
          ...deps.map(({ [ID]: depId }) =>
            depId in flatNew ? flatNew[depId] : flatOld[depId],
          ),
        );

        flatNew[id] = newValue;

        if ((!isCacheExist && previousValue !== newValue) || isFirstHandle) {
          changes.push(id);
        }
      };
      if (!(actionType in handlersByDependency)) {
        handlersByDependency[actionType] = new Set();
      }
      handlersByDependency[actionType].add(handler);

      return builder;
    },
    compute(...args) {
      if (isDone) {
        throw new OwnError(
          'Reducer is "done" - dependencies locked and can not be changed',
        );
      }
      let mapper = args.pop();
      const deps = args;
      const dependedActionTypesList = [];

      if (deps.length === 0) {
        if (typeof mapper === 'object' && mapper !== null) {
          const shape = mapper;
          const keys = Object.keys(shape);
          for (let i = 0; i < keys.length; i++) {
            deps.push(shape[keys[i]]);
          }
          mapper = (state, ...values) =>
            values.reduce((acc, v, i) => ((acc[keys[i]] = v), acc), {});
        } else {
          throw new OwnError('Dependencies not passed');
        }
      }
      if (typeof mapper !== 'function') {
        throw new OwnError('Expected the mapper is must be a function');
      }
      for (let i = 0; i < deps.length; i++) {
        if (!deps[i][ID]) {
          throw new OwnError(
            'Computed dependencies can be only the others reducers',
          );
        }
        if (!deps[i][IS_DONE]) {
          throw new OwnError(`Dependency №${i + 1} is not "done"`);
        }
      }

      for (let i = 0; i < deps.length; i++) {
        const depDepsHandlers = deps[i][DEPS_HANDLERS_LIST];
        // eslint-disable-next-line
        for (const depActionType in depDepsHandlers) {
          if (dependedActionTypesList.indexOf(depActionType) === -1) {
            dependedActionTypesList.push(depActionType);
          }

          if (!(depActionType in handlersByDependency)) {
            handlersByDependency[depActionType] = new Set();
          }
          depDepsHandlers[depActionType].forEach(handler =>
            handlersByDependency[depActionType].add(handler),
          );
        }
      }

      for (let i = 0; i < dependedActionTypesList.length; i++) {
        handlersByDependency[dependedActionTypesList[i]].add(
          ({ flatNew, flatOld, changes }) => {
            const isCacheExist = id in flatNew;
            let isFirstHandle = false;
            let previousValue;
            if (isCacheExist) {
              previousValue = flatNew[id];
            } else if (id in flatOld) {
              previousValue = flatOld[id];
            } else {
              previousValue = defaultValue;
              isFirstHandle = true;
            }

            const newValue = mapper(
              previousValue,
              ...deps.map(({ [ID]: depId }) =>
                depId in flatNew ? flatNew[depId] : flatOld[depId],
              ),
            );

            flatNew[id] = newValue;

            if (
              (!isCacheExist && previousValue !== newValue) ||
              isFirstHandle
            ) {
              changes.push(id);
            }
          },
        );
      }

      return builder;
    },
    lens(actionType, mapper) {
      if (isDone) {
        throw new OwnError(
          'Reducer is "done" - dependencies locked and can not be changed',
        );
      }
      if (typeof actionType !== 'string') {
        throw new OwnError('The action type is must be a string');
      }
      if (typeof mapper !== 'function') {
        throw new OwnError('The mapper is must be a function');
      }

      const handler = ({ flatNew, flatOld, changes }, action) => {
        const { key, payload } = action;

        if (!('key' in action)) {
          throw new OwnError(
            'Can not use "lense" handler without the key of item',
          );
        }

        const isCacheExist = id in flatNew;
        let isFirstHandle = false;
        let previousValue;
        if (isCacheExist) {
          previousValue = flatNew[id];
        } else if (id in flatOld) {
          previousValue = flatOld[id];
        } else {
          previousValue = defaultValue;
          isFirstHandle = true;
        }

        const previousItemValue = get(previousValue, key);
        const newItemValue = mapper(previousItemValue, payload);
        // TODO: check changes
        const newValue = set(previousValue, key, newItemValue);

        flatNew[id] = newValue;
        if ((!isCacheExist && previousValue !== newValue) || isFirstHandle) {
          changes.push({ id, key });
        }
      };
      if (!(actionType in handlersByDependency)) {
        handlersByDependency[actionType] = new Set();
      }
      handlersByDependency[actionType].add(handler);

      return builder;
    },
    done() {
      isDone = true;
      builder[IS_DONE] = isDone;

      return builder;
    },
    build() {
      if (!isDone) {
        throw new OwnError(
          'Reducer is not "done" - dependencies steel open to changes',
        );
      }
      const handlerComputedByDependency = Object.create(null);
      // eslint-disable-next-line
      for (const actionType in handlersByDependency) {
        let resultHandler = noop;
        handlersByDependency[actionType].forEach(handler => {
          const previousHandler = resultHandler;
          resultHandler = (context, action) => {
            previousHandler(context, action);
            handler(context, action);
          };
        });
        handlerComputedByDependency[actionType] = resultHandler;
      }

      function reducer(
        state = {
          flat: Object.create(null),
          root: defaultValue,
          changes: [],
        },
        action,
      ) {
        if (!isValidState(state)) throw new OwnError('Invalid state');
        if (!isValidAction(action)) throw new OwnError('Invalid action');
        if (action.type in handlerComputedByDependency) {
          const context = {
            flatOld: state.flat,
            flatNew: Object.create(null),
            changes: [],
          };
          handlerComputedByDependency[action.type](context, action);
          if (context.changes.length === 0) {
            return state;
          }
          return {
            flat: { ...state.flat, ...context.flatNew },
            root: context.flatNew[id],
            changes: context.changes,
          };
        }
        return state;
      }

      reducer[ID] = id;
      reducer[GETTER] = get;

      return reducer;
    },
  };

  return builder;
}

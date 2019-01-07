/**
 * TODO: error descriptions
 */

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

const isValidContext = context =>
  Boolean(context && context.state && context.cache && context.changedIds);
const isValidAction = action => Boolean(action && action.type);

const ID = generateUid('@@tr/createReducer/ID');
const DEPS_HANDLERS_LIST = generateUid('@@tr/createReducer/DEPS_HANDLERS_LIST');
const IS_DONE = generateUid('@@tr/createReducer/IS_DONE');

function noop() {}

class OwnError extends Error {
  constructor(msg = '') {
    super(`@@tg-reducer/${msg}`);
  }
}

export function getId(reducer) {
  return reducer[ID];
}

export function createReducer(defaultValue) {
  const id = generateUid('@@tr/createReducer/id');
  // "dep*" - dependency
  const depsHandlersList = Object.create(null);
  let isDone = false;

  const builder = {
    [ID]: id,
    [DEPS_HANDLERS_LIST]: depsHandlersList,
    on(actionType, mapper) {
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

      const handler = ({ cache, state, changedIds }, action) => {
        const isCacheExist = id in cache;
        // eslint-disable-next-line
        const previousValue = isCacheExist
          ? cache[id]
          : id in state
          ? state[id]
          : defaultValue;
        const newValue = mapper(previousValue, action.payload);
        cache[id] = newValue;
        if (!isCacheExist && previousValue !== newValue) {
          changedIds.push(id);
        }
      };
      if (!(actionType in depsHandlersList)) {
        depsHandlersList[actionType] = new Set();
      }
      depsHandlersList[actionType].add(handler);

      return builder;
    },
    compute(...args) {
      if (isDone) {
        throw new OwnError(
          'Reducer is "done" - dependencies locked and can not be changed',
        );
      }
      const mapper = args.pop();
      const deps = args;
      const dependedActionTypesList = [];

      if (typeof mapper !== 'function') {
        throw new OwnError('Expected the mapper is must be a function');
      }
      if (deps.length === 0) {
        throw new OwnError('Dependencies not passed');
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

          if (!(depActionType in depsHandlersList)) {
            depsHandlersList[depActionType] = new Set();
          }
          depDepsHandlers[depActionType].forEach(handler =>
            depsHandlersList[depActionType].add(handler),
          );
        }
      }

      for (let i = 0; i < dependedActionTypesList.length; i++) {
        depsHandlersList[dependedActionTypesList[i]].add(
          ({ cache, state, changedIds }) => {
            const isCacheExist = id in cache;
            // eslint-disable-next-line
            const previousValue = isCacheExist
              ? cache[id]
              : id in state
              ? state[id]
              : defaultValue;
            const newValue = mapper(
              previousValue,
              ...deps.map(({ [ID]: depId }) =>
                depId in cache ? cache[depId] : state[depId],
              ),
            );
            cache[id] = newValue;
            if (!isCacheExist && previousValue !== newValue) {
              changedIds.push(id);
            }
          },
        );
      }

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
      const depsHandlers = Object.create(null);
      // eslint-disable-next-line
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

      return function reducer(context, action) {
        if (!isValidContext(context)) throw new OwnError('Invalid context');
        if (!isValidAction(action)) throw new OwnError('Invalid action');
        if (action.type in depsHandlers) {
          depsHandlers[action.type](context, action);
          return context.cache[id];
        }
        return context.state[id];
      };
    },
  };

  return builder;
}

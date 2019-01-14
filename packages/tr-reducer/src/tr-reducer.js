/**
 * TODO: error descriptions
 */
const prefix = '@@tr';

let count = 0;
const random = () =>
  Math.random()
    .toString(36)
    .substring(7);

const _Symbol =
  typeof Symbol === 'undefined'
    ? description => description + random()
    : Symbol;

const createInternalId = name => _Symbol(`${prefix}/${name}`);

function createId(description) {
  return `${prefix}__${description}__[${++count}]${random()}`;
}

const isValidState = state =>
  Boolean(state && state.flat !== null && typeof state.flat === 'object');
const isValidAction = action => Boolean(action && action.type);

const ID = createInternalId('reducer/ID');
const HANDLERS_BY_DEPS = createInternalId('reducer/HANDLERS_BY_DEPS');
const IS_NO_CHANGES = createInternalId('reducer/IS_NO_CHANGES');
const CHANGES_LIST = createInternalId('reducer/CHANGES_LIST');

function noop() {}

class OwnError extends Error {
  constructor(msg = '') {
    super(`${prefix}/${msg}`);
  }
}

/**
 * @param {Function} reducer builded from collection
 * @returns {*} id of reducer
 */
export function __getId(reducer) {
  return reducer[ID];
}

/**
 * Create new collection for handling action types and other collections
 * @param {*} defaultValue
 * @param {string} description
 */
export function createCollection(defaultValue, description = '') {
  const id = createId(description);
  // "dep*" - shortcut for "dependency"
  const handlersByDeps = Object.create(null);

  const collector = {
    [ID]: id,
    /**
     * Add handler to action, optionally produce values from other collections (but not react by them)
     * @param {string} actionType
     * @param {...dependedCollection} dependencies
     * @param {(state, actionPayload, ...dependenciesValues) => newState} mapper
     * @returns {collection}
     */
    on(...args) {
      const actionType = args.shift();
      const mapper = args.pop();
      const deps = args;
      if (typeof actionType !== 'string') {
        throw new OwnError('The action type is must be a string');
      }
      if (typeof mapper !== 'function') {
        throw new OwnError('The mapper is must be a function');
      }
      for (let i = 0; i < deps.length; i++) {
        if (!deps[i][HANDLERS_BY_DEPS]) {
          throw new OwnError(
            'Dependencies can be computed only from others done "tr" reducers. ' +
              `Dependency №${i + 1} is not valid`,
          );
        }
      }

      const handler = ({ flatNew, flatOld, changes }, action) => {
        const result = mapper(
          // eslint-disable-next-line
          id in flatNew
            ? flatNew[id]
            : id in flatOld
            ? flatOld[id]
            : defaultValue,
          action.payload,
          ...deps.map(({ [ID]: depId }) =>
            depId in flatNew ? flatNew[depId] : flatOld[depId],
          ),
        );

        if (!Array.isArray(result)) {
          console.log(result)
          throw new OwnError(
            '"mapper" must return a array.\n' +
              '[first item - is new state, second item - is list of changes.\n' +
              'empty array - is nothing change]',
          );
        }
        switch (result.length) {
          case 0:
            return;
          case 1: {
            const newValue = result[0];
            flatNew[id] = newValue;
            if (!(id in changes)) changes[id] = [];
            break;
          }
          case 2: {
            flatNew[id] = result[0];
            (changes[id] || (changes[id] = [])).push(...result[1]);
            break;
          }
          default:
            throw new OwnError('Returns to many items, expected 2 or less');
        }
      };

      if (!(actionType in handlersByDeps)) {
        handlersByDeps[actionType] = new Set();
      }
      handlersByDeps[actionType].add(handler);

      return collector;
    },
    /**
     * Add handler to other collections
     * @param {...dependedCollection} dependencies
     * @param {(state, ...dependenciesValues) => newState} mapper
     * @returns {collection}
     */
    compute(...args) {
      let mapper = args.pop();
      const deps = args;

      if (deps.length === 0) {
        if (typeof mapper === 'object' && mapper !== null) {
          const shape = mapper;
          const keys = Object.keys(shape);

          if (keys.length === 0) {
            throw new OwnError('Dependencies not passed');
          }

          for (let i = 0; i < keys.length; i++) {
            deps.push(shape[keys[i]]);
          }

          // TODO: add option for modification mapper
          mapper = (state, ...values) =>
            [values.reduce((acc, v, i) => ((acc[keys[i]] = v), acc), {})];
        } else {
          throw new OwnError('Dependencies not passed');
        }
      }
      if (typeof mapper !== 'function') {
        throw new OwnError('The mapper is must be a function');
      }

      for (let i = 0; i < deps.length; i++) {
        if (!deps[i][HANDLERS_BY_DEPS]) {
          throw new OwnError(
            'Dependencies can be computed only from others done "tr" reducers. ' +
              `Dependency №${i + 1} is not valid`,
          );
        }
      }

      const depsActionTypeList = [];

      for (let depIndex = 0; depIndex < deps.length; depIndex++) {
        const depHandlersByDeps = deps[depIndex][HANDLERS_BY_DEPS];
        const depHandlersByDepsKeys = Object.keys(depHandlersByDeps);
        for (let i = 0; i < depHandlersByDepsKeys.length; i++) {
          const depActionType = depHandlersByDepsKeys[i];
          if (depsActionTypeList.indexOf(depActionType) === -1) {
            depsActionTypeList.push(depActionType);
          }

          const handlersByDep =
            handlersByDeps[depActionType] ||
            (handlersByDeps[depActionType] = new Set());
          depHandlersByDeps[depActionType].forEach(handler =>
            handlersByDep.add(handler),
          );
        }
      }

      for (let i = 0; i < depsActionTypeList.length; i++) {
        handlersByDeps[depsActionTypeList[i]].add(
          ({ flatNew, flatOld, changes }) => {
            const result = mapper(
              // eslint-disable-next-line
              id in flatNew
                ? flatNew[id]
                : id in flatOld
                ? flatOld[id]
                : defaultValue,
              ...deps.map(({ [ID]: depId }) =>
                depId in flatNew ? flatNew[depId] : flatOld[depId],
              ),
            );

            if (!Array.isArray(result)) {
              throw new OwnError(
                '"mapper" must return a array.\n' +
                  '[first item - is new state, second item - is list of changes.\n' +
                  'empty array - is nothing change]',
              );
            }
            switch (result.length) {
              case 0:
                return;
              case 1: {
                const newValue = result[0];
                flatNew[id] = newValue;
                if (!(id in changes)) changes[id] = [];
                break;
              }
              case 2: {
                flatNew[id] = result[0];
                (changes[id] || (changes[id] = [])).push(...result[1]);
                break;
              }
              default:
                throw new OwnError('Returns to many items, expected 2 or less');
            }
          },
        );
      }

      return collector;
    },
    /**
     * End collection filling (needed for prevent recursive dependencies)
     * @returns {builder}
     */
    done() {
      return {
        [ID]: id,
        [HANDLERS_BY_DEPS]: handlersByDeps,
        /**
         * Build handlers for each dependency (action type)
         * @returns {({ flat: Object, root: state, changes: Object }, { type: string, payload: any }) => newState)} reducer
         */
        build(
          mergeChanges = (flatOld, flatNew) =>
            Object.assign(Object.create(null), flatOld, flatNew),
        ) {
          const handlerComputedByDependency = Object.create(null);
          const depDepsHandlersKeys = Object.keys(handlersByDeps);
          for (let i = 0; i < depDepsHandlersKeys.length; i++) {
            const actionType = depDepsHandlersKeys[i];
            let resultHandler = noop;
            handlersByDeps[actionType].forEach(handler => {
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
              changes: Object.create(null),
            },
            action,
          ) {
            if (!isValidState(state)) throw new OwnError('Invalid state');
            if (!isValidAction(action)) throw new OwnError('Invalid action');
            if (action.type in handlerComputedByDependency) {
              const context = {
                flatOld: state.flat,
                flatNew: Object.create(null),
                changes: Object.create(null),
              };

              handlerComputedByDependency[action.type](context, action);

              const flat = mergeChanges(state.flat, context.flatNew);

              return {
                flat,
                root: flat[id],
                changes: context.changes,
              };
            }
            return state;
          }

          return reducer;
        },
      };
    },
  };

  return collector;
}

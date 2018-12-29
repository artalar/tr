let counter = 0;
const createConstant =
  typeof Symbol === 'function'
    ? Symbol
    : description =>
        TR_PREFIX + description + '__' + counter++ + '/' + Math.random();

const TR_PREFIX = '@@tr/';
const IS_TR = createConstant('IS_TR');
const TYPE = createConstant('TYPE');
const CALLER = createConstant('CALLER');
const ADD = createConstant('ADD');

function validateFunctionType(func, name) {
  if (typeof func !== 'function') {
    throw new TypeError(`${TR_PREFIX}: ${name} must be function`);
  }
}

function validateDependencies(dependencies) {
  if (
    !Array.isArray(dependencies) ||
    dependencies.length === 0 ||
    dependencies.some(d => !d[IS_TR])
  ) {
    // TODO: improve error description
    throw new TypeError(TR_PREFIX + ': invalid dependencies');
  }
}

function collectStarters(dependencies) {
  return dependencies.reduce(
    (acc, d) => (d[CALLER].forEach(dd => acc.add(dd)), acc),
    new Set(),
  );
}

let compose = (a, b) => {
  return _ => a(b(_));
};

// usefull for debug
// or prevent maximum call stack on large dependencies tree
// (can be replaced by cycle)
export function __replaceCompose(newCompose) {
  compose = newCompose;
}

export function handleSnapshot(node, callback) {
  node[ADD](ctx => (callback(ctx), ctx));
}

export function getValueFromSnapshot(snapshot, node) {
  return snapshot[node[TYPE]];
}

// PROPOSAL:
// collect dependencies, compose by manual request
export function createCaller() {
  function starter(a, snaphot = {}) {
    return next(Object.assign({}, snaphot, { [type]: a }));
  }

  const type = createConstant('createCaller');
  starter[IS_TR] = true;
  starter[TYPE] = type;
  starter[CALLER] = new Set([starter]);
  starter[ADD] = callback => {
    validateFunctionType(callback, 'next');
    next = compose(
      callback,
      next,
    );
    return starter;
  };

  let next = _ => _;

  return starter;
}

export function combine(dependencies, mapper) {
  validateDependencies(dependencies);
  validateFunctionType(mapper, 'mapper');

  function map(ctx) {
    ctx[type] = mapper(ctx[type], ...ctx[typeCache]);
    return ctx;
  }

  const type = createConstant('combine');
  const typeCache = createConstant('combine/cache');
  map[IS_TR] = true;
  map[TYPE] = type;
  map[CALLER] = collectStarters(dependencies);
  map[ADD] = next => {
    map[CALLER].forEach(d => d[ADD](next));
    return map;
  };

  for (let i = 0; i < dependencies.length; i++) {
    const dependencyType = dependencies[i][TYPE];
    dependencies[i][ADD](ctx => {
      const cache = ctx[typeCache] || new Array(dependencies.length);
      cache[i] = ctx[dependencyType];
      ctx[typeCache] = cache;
      return ctx;
    });
  }

  map[ADD](map);

  return map;
}

// TODO: copypast needed parts from `combine` and remove it
export function createHandler() {
  let type;
  const handlersDependencies = [];
  const handlersMappers = [];
  function mapper(ctx) {
    return ctx[type];
  }

  const chain = {
    on(dependencies, mapper) {
      validateDependencies(dependencies);
      validateFunctionType(mapper, 'mapper');
      handlersDependencies.push(dependencies);
      handlersMappers.push(mapper);
      return chain;
    },
    done() {
      const resultDependencies = handlersDependencies.map(
        (handlerDependencies, i) => {
          let handlerType;

          const handlerStarters = collectStarters(handlerDependencies);

          handlerStarters.forEach(d =>
            d[ADD](ctx => {
              ctx[handlerType] = mapper(ctx);
              return ctx;
            }),
          );

          const handler = combine(handlerDependencies, handlersMappers[i]);

          handlerStarters.forEach(d =>
            d[ADD](ctx => {
              ctx[type] = ctx[handlerType];
              return ctx;
            }),
          );

          handlerType = handler[TYPE];

          return handler;
        },
      );

      const result = combine(resultDependencies, _ => _);

      type = result[TYPE];

      return result;
    },
  };

  return chain;
}

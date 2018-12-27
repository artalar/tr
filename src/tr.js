function validateFunctionType(func, name) {
  if (typeof func !== 'function') {
    throw new TypeError(`@@tr: ${name} must be function`);
  }
}

function validateDependencies(dependencies) {
  if (
    !Array.isArray(dependencies) ||
    dependencies.length === 0 ||
    dependencies.some(d => !d instanceof TR)
  ) {
    throw new TypeError('@@tr: invalid dependencies');
  }
}

function combine(next, call) {
  return a => next(call(a));
}

class TR {}

let entryPointCounter = 0;
export class EntryPoint extends TR {
  constructor() {
    super();
    const type = `@@tr/EntryPoint/${++entryPointCounter}`;
    this.type = type;
    this._dependencies = new Set([this]);
    this._next = a => a;
  }

  callWithSnapshot(a, snaphot = {}) {
    this._next(Object.assign({}, snaphot, { [this.type]: a }));
  }

  call(a) {
    this.callWithSnapshot(a);
  }

  add(next) {
    validateFunctionType(next, 'next');
    this._next = combine(next, this._next);
  }
}

let nodeCounter = 0;
export class Node extends TR {
  constructor(dependencies, mapper) {
    super();
    validateDependencies(dependencies);
    validateFunctionType(mapper, 'mapper');

    const type = `@@tr/Node/${++nodeCounter}`;
    const cacheType = type + '/cache';
    this.type = type;
    this._dependencies = dependencies.reduce(
      (acc, d) => (d._dependencies.forEach(v => acc.add(v)), acc),
      new Set(),
    );

    for (let i = 0; i < dependencies.length; i++) {
      const dependency = dependencies[i];
      dependency.add(ctx => {
        const cache = ctx[cacheType] || new Array(dependencies.length);
        cache[i] = ctx[dependency.type];
        ctx[cacheType] = cache;
        return ctx;
      });
    }
    this.add(ctx => {
      ctx[type] = mapper(...ctx[cacheType]);
      return ctx;
    });
  }

  add(next) {
    this._dependencies.forEach(d => d.add(next));
  }
}

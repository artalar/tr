export class Tr {
  constructor() {
    this._depsHandlers = Object.create(null);
    this._id = this._getId();
  }

  _getId() {
    return Symbol();
  }

  on(entryPoint, mapper) {
    if (typeof mapper !== 'function') throw new TypeError();
    const id = this._id;
    const handler = context => {
      if (!(id in context.cache)) {
        context.cache[id] = mapper(context.state[id], context.payload);
      }
    };
    if (entryPoint in this._depsHandlers) {
      const lastHandler = this._depsHandlers[entryPoint];
      this._depsHandlers[entryPoint] = context => {
        lastHandler(context);
        handler(context);
      };
    } else {
      this._depsHandlers[entryPoint] = handler;
    }

    return this;
  }

  compute(...args) {
    const id = this._id;
    const mapper = args.pop();
    const deps = args;
    const entryPointsList = [];

    for (let i = 0; i < deps.length; i++) {
      if (!(deps[i] instanceof Tr)) throw new TypeError();
    }

    for (let i = 0; i < deps.length; i++) {
      const dep = deps[i];
      for (const depEntryPointName in dep._depsHandlers) {
        const depHandler = dep._depsHandlers[depEntryPointName];
        if (entryPointsList.indexOf(depEntryPointName) === -1) {
          entryPointsList.push(depEntryPointName);
        }

        if (depEntryPointName in this._depsHandlers) {
          const lastHandler = this._depsHandlers[depEntryPointName];
          this._depsHandlers[depEntryPointName] = context => {
            depHandler(context);
            lastHandler(context);
          };
        } else {
          this._depsHandlers[depEntryPointName] = depHandler;
        }
      }
    }

    for (let i = 0; i < entryPointsList.length; i++) {
      const entryPoint = entryPointsList[i];
      const lastHandler = this._depsHandlers[entryPoint];
      this._depsHandlers[entryPoint] = context => {
        lastHandler(context);
        const { cache, state } = context;
        cache[id] = mapper(
          state[id],
          ...deps.map(({ _id }) => (_id in cache ? cache[_id] : state[_id])),
        );
      };
    }

    return this;
  }

  run(context, entryPoint) {
    this._depsHandlers[entryPoint](context);
    return context.cache[this._id];
  }
}

export function createStore(tr) {
  const context = { cache: Object.create(null), state: Object.create(null) };
  const subscribers = new Map();

  function run(entryPoint, payload) {
    context.payload = payload;
    try {
      const result = tr.run(context, entryPoint);
      context.state = Object.assign(context.state, context.cache);
      for (let [id, relativeSubscribers] of subscribers) {
        if (id in context.cache) {
          relativeSubscribers.forEach(s => s(context.cache[id]));
        }
      }
      return result;
    } finally {
      context.cache = Object.create(null);
    }
  }

  return {
    dispatch(type, payload) {
      return run(type, payload);
    },
    subscribe(listener, target = tr) {
      const id = target._id;
      if (!subscribers.has(id)) {
        subscribers.set(id, new Set());
      }
      const relativeSubscribers = subscribers.get(id);
      relativeSubscribers.add(listener);
      return () => relativeSubscribers.delete(listener);
    },
    getState() {
      return context.state;
    },
  };
}

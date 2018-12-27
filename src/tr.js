function emptyCall() {}

function validateFunction(callback, name) {
  if (typeof callback !== "function") {
    throw new TypeError(`${name} must be function`);
  }
}

export class EntryPoint {
  _next = emptyCall;

  add(callback) {
    validateFunction(callback, "callback");
    const parentStep = this._next;
    this._next = function() {
      parentStep();
      callback();
    };
  }

  call(argument) {
    this._payload = argument;
    try {
      this._next();
    } finally {
      this._payload = undefined;
    }
  }

  getData() {
    return this._payload;
  }
}

export class Cache {
  constructor(dependencies) {
    if (!Array.isArray(dependencies) || dependencies.length < 2) {
      throw new TypeError("Invalid dependencies");
    }

    this._dependencies = dependencies;
    this._cache = new Array(dependencies.length);

    for (let i = 0; i < dependencies.length; i++) {
      const entryPoint = dependencies[i];
      entryPoint.add(() => {
        this._cache[i] = entryPoint.getData();
      });
    }
  }

  add(callback) {
    const entryPoints = this._dependencies;

    for (let i = 0; i < entryPoints.length; i++) {
      entryPoints[i].add(callback);
    }
  }

  getData() {
    return this._cache;
  }
}

export class Node {
  constructor(dependencies, mapper) {
    if (!Array.isArray(dependencies) || dependencies.length === 0) {
      throw new TypeError("Invalid dependencies");
    }

    validateFunction(mapper, "mapper");

    this._subscribers = new Set();

    if (dependencies.length === 1) {
      this._dependency = dependencies[0];
    } else {
      this._dependency = new Cache(dependencies);
      const _mapper = mapper;
      mapper = args => _mapper.apply(null, args);
    }

    this._dependency.add(() =>
      this._notify(mapper(this._dependency.getData()))
    );
  }

  _notify(newValue) {
    this._value = newValue;
    try {
      this.subscribers.forEach(cb => cb(newValue));
    } finally {
      this._value = undefined;
    }
  }

  add(callback) {
    this._dependency.add(callback);
  }

  getData() {
    return this._value;
  }

  subscribe(cb) {
    validateFunction(cb, "callback");
    const subscribers = this._subscribers;
    subscribers.add(cb);
    return function unsubscribe() {
      subscribers.delete(cb);
    };
  }
}


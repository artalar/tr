import React from "react";
import { getId } from "@artalar/tr-reducer";
import { CONTEXT_KEY } from "@artalar/tr-redux";

const Context = React.createContext();

export class Provider extends React.Component {
  subscribers = new Set();

  componentDidMount() {
    const {
      subscribers,
      props: {
        store,
        store: { [CONTEXT_KEY]: context }
      }
    } = this;

    this.unsubscribe = store.subscribe(() => {
      const { changedIds, cache } = context;
      for (let i = 0; i < changedIds.length; i++) {
        const id = changedIds[i];
        if (id in subscribers) {
          const newValue = cache[id];
          subscribers[id].forEach(s => s(newValue));
        }
      }
    });
  }

  componentWillUnmount() {
    if (this.unsubscribe) this.unsubscribe();
  }

  getReducerState = target => {
    if (!target) return;
    return this.props.store[CONTEXT_KEY].state[getId(target)];
  };

  subscribe = (target, listener) => {
    if (!target) {
      return () => {};
    }
    const { subscribers } = this;
    const id = getId(target);
    if (!(id in subscribers)) {
      subscribers[id] = new Set();
    }
    const relativeSubscribers = subscribers[id];

    relativeSubscribers.add(listener);
    return () => {
      relativeSubscribers.delete(listener);
      subscribers[id] = new Set(relativeSubscribers);
    };
  };

  render() {
    return React.createElement(
      Context.Provider,
      {
        value: {
          dispatch: this.props.store.dispatch,
          subscribe: this.subscribe,
          getReducerState: this.getReducerState
        }
      },
      this.props.children
    );
  }
}

function performOptions(options) {
  switch (typeof options) {
    case "function":
      return {
        mapper: options,
        predicate: () => true
      };
    case "object": {
      return options;
    }
    case "undefined":
      return {
        mapper: () => ({}),
        predicate: () => true
      };
    case "string": {
      const key = options;
      return {
        mapper: v => ({ [key]: v }),
        predicate: () => true
      };
    }
    default:
      throw new TypeError("Unexpected connnect options");
  }
}

export const connect = (target, options, predicate) => {
  const { mapper } = performOptions(options);

  return Component =>
    class Connected extends React.Component {
      static contextType = Context;

      componentDidMount() {
        this.unsubscribe = this.context.subscribe(target, value =>
          this.forceUpdate()
        );
      }

      componentWillUnmount() {
        if (this.unsubscribe) this.unsubscribe();
      }

      getReducerState() {
        return this.context.getReducerState(target);
      }

      render() {
        return React.createElement(
          Component,
          {
            ...this.props,
            ...mapper(this.getReducerState(), this.props),
            dispatch: this.context.dispatch
          },
          this.props.children
        );
      }
    };
};

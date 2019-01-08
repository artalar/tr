import React from 'react';

const Context = React.createContext();

export class Provider extends React.Component {
  render() {
    return React.createElement(
      Context.Provider,
      {
        value: this.props.store,
      },
      this.props.children,
    );
  }
}

function performOptions(options) {
  switch (typeof options) {
    case 'function':
      return {
        mapper: options,
        predicate: () => true,
      };
    case 'object': {
      return options;
    }
    case 'undefined':
      return {
        mapper: () => ({}),
        predicate: () => true,
      };
    case 'string': {
      const key = options;
      return {
        mapper: v => ({ [key]: v }),
        predicate: () => true,
      };
    }
    default:
      throw new TypeError('Unexpected connnect options');
  }
}

export const connect = (target, options, key) => {
  const { mapper } = performOptions(options);

  return Component =>
    class Connected extends React.Component {
      static contextType = Context;

      state = {};

      componentDidMount() {
        this.unsubscribe =
          key === undefined
            ? this.context.subscribe(() => this.forceUpdate(), target)
            : this.context.subscribe(() => this.forceUpdate(), target, key);
      }

      componentWillUnmount() {
        if (this.unsubscribe) this.unsubscribe();
      }

      render() {
        return React.createElement(
          Component,
          {
            ...this.props,
            ...mapper(this.context.getState(target, key), this.props),
            dispatch: this.context.dispatch,
          },
          this.props.children,
        );
      }
    };
};

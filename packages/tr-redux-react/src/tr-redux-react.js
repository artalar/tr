import React from 'react';

function getDisplayName(WrappedComponent) {
  return WrappedComponent.displayName || WrappedComponent.name || 'Component';
}

function execute(fn) {
  fn();
}

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

export const connect = (target, fabric) => {
  if (typeof fabric !== 'function') {
    throw new TypeError('The fabric (second argument) is not a function');
  }

  return Component => {
    const name = `Connect(${getDisplayName(Component)})`;

    return class Connected extends React.Component {
      static contextType = Context;

      static displayName = name;

      constructor(...a) {
        super(...a);

        const mapper = fabric(
          target ? this.context.getState(target) : this.context.getState(),
          this.props,
          this.context.dispatch,
          keys => (this._keys = keys),
        );

        if (typeof mapper !== 'function') {
          throw new TypeError(
            `The fabric of "${name}" should return a mapper function`,
          );
        }

        this._mapNewProps = mapper;
        this._keys = this._keys || [];
      }

      componentDidMount() {
        this.unsubscribers =
          this._keys.length === 0
            ? target
              ? [this.context.subscribe(() => this.forceUpdate(), target)]
              : []
            : this._keys.map(key =>
                this.context.subscribe(() => this.forceUpdate(), target, key),
              );
      }

      componentWillUnmount() {
        if (this.unsubscribers) this.unsubscribers.map(execute);
      }

      render() {
        return React.createElement(
          Component,
          Object.assign(
            {},
            this.props,
            this._mapNewProps(
              target ? this.context.getState(target) : this.context.getState(),
              this.props,
            ),
          ),
          this.props.children,
        );
      }
    };
  };
};

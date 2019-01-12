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

export const connect = (target, onNewProps, onInitial) => {
  if (!target) {
    target = undefined;
  }
  if (!onNewProps) {
    onNewProps = () => ({});
  } else if (typeof onNewProps !== 'function') {
    const key = onNewProps;
    onNewProps = state => ({ [key]: state });
  }

  if (onInitial === undefined) {
    onInitial = () => ({});
  } else if (typeof onInitial !== 'function') {
    const key = onInitial;
    onInitial = () => ({ key });
  }

  return Component =>
    class Connected extends React.Component {
      static contextType = Context;

      constructor(...a) {
        super(...a);

        this._initialProps = onInitial({
          ...this.props,
          dispatch: this.context.dispatch,
        });
        this._key = this._initialProps.key;

        const { key: _deleted, ...initialPropsRest } = this._initialProps;
        this._initialProps = initialPropsRest;
      }

      componentDidMount() {
        this.unsubscribe =
          this._key === undefined
            ? this.context.subscribe(() => this.forceUpdate(), target)
            : this.context.subscribe(
                () => this.forceUpdate(),
                target,
                this._key,
              );
      }

      componentWillUnmount() {
        if (this.unsubscribe) this.unsubscribe();
      }

      render() {
        return React.createElement(
          Component,
          {
            ...this.props,
            ...this._initialProps,
            ...onNewProps(this.context.getState(target, this._key), this.props),
          },
          this.props.children,
        );
      }
    };
};

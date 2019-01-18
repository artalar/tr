import { createStore, combineReducers } from 'redux';

import { handler, composeEnhancers, __getId } from '../../lib';

describe('tr-redux', () => {
  describe('createStore', () => {
    it('getState', () => {
      const child = handler(true).done();
      const root = handler()
        .compute({ child })
        .done();

      const store = createStore(root, composeEnhancers());

      expect(store.getState(child)).toBe(true);
      expect(store.getState(root)).toEqual({ child: true });
      expect(store.getState()).toEqual({
        changes: { [__getId(child)]: [], [__getId(root)]: [] },
        flat: {
          [__getId(child)]: true,
          [__getId(root)]: { child: true },
        },
        root: { child: true },
      });
    });

    it('dispatch', () => {
      const change = 'CHANGE';

      const reducer = handler({ prop: false })
        .on(change, (state, prop) => [{ prop }])
        .done();

      const store = createStore(reducer, composeEnhancers());

      expect(store.getState().root).toEqual({ prop: false });

      store.dispatch({ type: change, payload: true });

      expect(store.getState().root).toEqual({ prop: true });
    });

    it('subscribe', () => {
      const changeProp = 'CHANGE_PROP';
      const changeRoot = 'CHANGE_ROOT';
      const rootSubscriber = jest.fn();
      const propSubscriber = jest.fn();

      const prop = handler(false)
        .on(changeProp, (state, value) => [value])
        .done();
      const reducer = handler()
        .on(changeRoot, (state, data) => [{ ...state, ...data }])
        .compute({ prop })
        .done();

      const store = createStore(reducer, composeEnhancers());

      const rootSubscriberUnsubscribe = store.subscribe(rootSubscriber);
      const propSubscriberUnsubscribe = store.subscribe(propSubscriber, prop);

      expect(store.getState().root).toEqual({ prop: false });

      store.dispatch({ type: changeProp, payload: true });

      expect(store.getState().root).toEqual({ prop: true });

      expect(rootSubscriber.mock.calls.length).toBe(1);
      expect(propSubscriber.mock.calls.length).toBe(1);

      store.dispatch({ type: changeRoot, payload: {} });
      expect(rootSubscriber.mock.calls.length).toBe(2);
      expect(propSubscriber.mock.calls.length).toBe(1);

      rootSubscriberUnsubscribe();
      propSubscriberUnsubscribe();
      store.dispatch({ type: changeProp, payload: null });
      expect(rootSubscriber.mock.calls.length).toBe(2);
      expect(propSubscriber.mock.calls.length).toBe(1);
    });

    it('tellChanges', () => {
      const changeList = 'CHANGE_LIST';
      const changeItem = 'CHANGE_ITEM';
      const listSubscriber = jest.fn();
      const firstItemSubscriber = jest.fn();
      const secondItemSubscriber = jest.fn();

      const list = handler([])
        .on(changeList, (state, data) => [data])
        .on(changeItem, (state, { value, index }) => [
          state.map((v, i) => (i === index ? value : v)),
          [index],
        ])
        .done();

      const store = createStore(list, composeEnhancers());

      const listSubscriberUnsubscribe = store.subscribe(listSubscriber);
      const firstItemSubscriberUnsubscribe = store.subscribe(
        state => firstItemSubscriber(state[0]),
        list,
        0,
      );
      const secondItemUnsubscribe = store.subscribe(
        state => secondItemSubscriber(state[1]),
        list,
        1,
      );

      expect(store.getState().root).toEqual([]);

      store.dispatch({
        type: changeList,
        payload: [0, 1, 2],
      });
      expect(store.getState().root).toEqual([0, 1, 2]);
      expect(listSubscriber.mock.calls.length).toBe(1);
      expect(listSubscriber.mock.calls[0][0]).toEqual([0, 1, 2]);
      expect(firstItemSubscriber.mock.calls.length).toBe(1);
      expect(firstItemSubscriber.mock.calls[0][0]).toEqual(0);
      expect(secondItemSubscriber.mock.calls.length).toBe(1);
      expect(secondItemSubscriber.mock.calls[0][0]).toEqual(1);

      store.dispatch({
        type: changeItem,
        payload: { index: 0, value: 1.1 },
      });

      expect(store.getState().root).toEqual([1.1, 1, 2]);
      expect(listSubscriber.mock.calls.length).toBe(2);
      expect(listSubscriber.mock.calls[1][0]).toEqual([1.1, 1, 2]);
      expect(firstItemSubscriber.mock.calls.length).toBe(2);
      expect(firstItemSubscriber.mock.calls[1][0]).toEqual(1.1);
      expect(secondItemSubscriber.mock.calls.length).toBe(1);

      listSubscriberUnsubscribe();
      firstItemSubscriberUnsubscribe();
      store.dispatch({
        type: changeList,
        payload: [10, 20, 30],
      });
      expect(store.getState().root).toEqual([10, 20, 30]);
      expect(listSubscriber.mock.calls.length).toBe(2);
      expect(firstItemSubscriber.mock.calls.length).toBe(2);
      expect(secondItemSubscriber.mock.calls.length).toBe(2);

      secondItemUnsubscribe();
      store.dispatch({
        type: changeList,
        payload: [],
      });
      expect(secondItemSubscriber.mock.calls.length).toBe(2);
    });
  });
  describe('perf', () => {
    // const it = (name, f) => f();

    const { performance } = require('perf_hooks');
    const { createSelector } = require('reselect');

    const heavyCalculates = () =>
      new Array(1000).fill(0).map(() => Math.random());

    const reducerFabric = (parentId, initialState) => {
      const prefix = parentId !== '10' && !(parentId % 2) ? parentId - 1 : parentId
      const actionTypes = {
        _1: `${prefix}1`,
        _2: `${prefix}2`,
        _3: `${prefix}3`,
        _4: `${prefix}4`,
        _5: `${prefix}5`,
      }
      return (state = initialState, action) => {
        switch (action.type) {
          case actionTypes._1:
            return action.payload;
          case actionTypes._2:
            return action.payload;
          case actionTypes._3:
            return action.payload;
          case actionTypes._4:
            return action.payload;
          case actionTypes._5:
            return action.payload;

          default:
            return state;
        }
      };
    };

    const reducerCombineFabric = id =>
      combineReducers({
        '1': reducerFabric(id, '1'),
        '2': reducerFabric(id, '2'),
        '3': reducerFabric(id, '3'),
        '4': reducerFabric(id, '4'),
        '5': reducerFabric(id, '5'),
      });

    const collectionsChildren = {};
    const collectionsNestedChildren = {
      '1': {},
      '2': {},
      '3': {},
      '4': {},
      '5': {},
      '6': {},
      '7': {},
      '8': {},
      '9': {},
      '10': {},
    };

    const collectionFabric = (parentId, initialState) => {
      const prefix = parentId !== '10' && !(parentId % 2) ? parentId - 1 : parentId
      return (collectionsNestedChildren[parentId][initialState] = handler(
        initialState,
        `collectionFabric${parentId + initialState}`,
      )
        .on(`${prefix}1`, (state, value) => [value])
        .on(`${prefix}2`, (state, value) => [value])
        .on(`${prefix}3`, (state, value) => [value])
        .on(`${prefix}4`, (state, value) => [value])
        .on(`${prefix}5`, (state, value) => [value])
        .done());}

    const collectionCombineFabric = id =>
      (collectionsChildren[id] = handler({}, `collectionCombineFabric${id}`)
        .compute({
          '1': collectionFabric(id, '1'),
          '2': collectionFabric(id, '2'),
          '3': collectionFabric(id, '3'),
          '4': collectionFabric(id, '4'),
          '5': collectionFabric(id, '5'),
        })
        .done());

    let storeRedux;
    let unsubscribersRedux;
    let storeTr;
    let unsubscribersTr;

    let reduxSubscribtionsCallsCount = 0;
    const reduxSubscribeChildren = () =>
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].map(id => {
        const subscriberMap = createSelector(
          state => state[id],
          () => reduxSubscribtionsCallsCount++,
        );
        const unsubscribe = storeRedux.subscribe(() => subscriberMap(storeRedux.getState()));

        if (id === '10') {
          return unsubscribe;
        }

        const unsubscribers = ['1', '2', '3', '4', '5'].map(nestedId => {
          const subscriberNestedMap = createSelector(
            state => state[id][nestedId],
            () => reduxSubscribtionsCallsCount++,
          );
          return storeRedux.subscribe(() =>
            subscriberNestedMap(storeRedux.getState()),
          );
        });

        return () => {
          unsubscribe()
          unsubscribers.forEach(f => f())
        }
      });

    let trSubscribtionsCallsCount = 0;
    const trSubscribeChildren = () =>
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].map(id => {
        const unsubscribe = storeTr.subscribe(
          () => trSubscribtionsCallsCount++,
          collectionsChildren[id],
        );

        if (id === '10') {
          return unsubscribe;
        }

        const unsubscribers = ['1', '2', '3', '4', '5'].map(nestedId =>
          storeTr.subscribe(
            () => trSubscribtionsCallsCount++,
            collectionsNestedChildren[id][nestedId],
          )
        );

        return () => {
          unsubscribe()
          unsubscribers.forEach(f => f())
        }
      });


    it('createStore [redux]', () => {
      const start = performance.now();

      storeRedux = createStore(
        combineReducers({
          '1': reducerCombineFabric('1'),
          '2': reducerCombineFabric('2'),
          '3': reducerCombineFabric('3'),
          '4': reducerCombineFabric('4'),
          '5': reducerCombineFabric('5'),
          '6': reducerCombineFabric('6'),
          '7': reducerCombineFabric('7'),
          '8': reducerCombineFabric('8'),
          '9': reducerCombineFabric('9'),
          '10': reducerFabric('10', '10'),
        }),
      );

      console.log(
        'createStore [redux]',
        (performance.now() - start).toFixed(3),'ms',
      );
    });

    it('createStore [tr]', () => {
      const start = performance.now();

      storeTr = createStore(
        handler({}, 'root')
          .compute({
            '1': collectionCombineFabric('1'),
            '2': collectionCombineFabric('2'),
            '3': collectionCombineFabric('3'),
            '4': collectionCombineFabric('4'),
            '5': collectionCombineFabric('5'),
            '6': collectionCombineFabric('6'),
            '7': collectionCombineFabric('7'),
            '8': collectionCombineFabric('8'),
            '9': collectionCombineFabric('9'),
            '10': collectionFabric('10', '10'),
          })
          .done(),
        composeEnhancers(),
      );

      console.log('createStore [tr]', (performance.now() - start).toFixed(3),'ms');

      expect(storeRedux.getState()).toEqual(storeTr.getState().root);
    });

    it('dispatch without subscribers [redux]', () => {
      const start = performance.now();

      storeRedux.dispatch({ type: '11', payload: '1' });

      console.log(
        'dispatch without subscribers [redux]',
        (performance.now() - start).toFixed(3),'ms',
      );
    });

    it('dispatch without subscribers [tr]', () => {
      const start = performance.now();

      storeTr.dispatch({ type: '11', payload: '1' });

      console.log(
        'dispatch without subscribers [tr]',
        (performance.now() - start).toFixed(3),'ms',
      );

      expect(reduxSubscribtionsCallsCount).toBe(trSubscribtionsCallsCount);
    });

    it('subscribe [redux]', () => {
      const start = performance.now();

      unsubscribersRedux = reduxSubscribeChildren();

      console.log('subscribe [redux]', (performance.now() - start).toFixed(3),'ms');
      // fill selectors cache
      storeRedux.dispatch({ type: '__none' });
    });

    it('subscribe [tr]', () => {
      const start = performance.now();

      unsubscribersTr = trSubscribeChildren();

      console.log('subscribe [tr]', (performance.now() - start).toFixed(3),'ms');
    });

    it('dispatch with many subscriptions [redux]', () => {
      reduxSubscribtionsCallsCount = 0;
      const start = performance.now();

      storeRedux.dispatch({ type: '11', payload: '1.1' });

      console.log(
        'dispatch with many subscriptions [redux]',
        (performance.now() - start).toFixed(3),'ms',
      );
      expect(reduxSubscribtionsCallsCount).toBe(12);
    });

    it('dispatch with many subscriptions [tr]', () => {
      trSubscribtionsCallsCount = 0;
      const start = performance.now();

      storeTr.dispatch({ type: '11', payload: '1.1' });

      console.log(
        'dispatch with many subscriptions [tr]',
        (performance.now() - start).toFixed(3),'ms',
      );

      // FIXME: why 13 vs 12? :thinking:
      expect(trSubscribtionsCallsCount).toBe(13);
    });

    it('dispatch with little subscriptions [redux]', () => {
      reduxSubscribtionsCallsCount = 0;
      const start = performance.now();

      storeRedux.dispatch({ type: '101', payload: '1.11' });

      console.log(
        'dispatch with little subscriptions [redux]',
        (performance.now() - start).toFixed(3),'ms',
      );

      expect(reduxSubscribtionsCallsCount).toBe(1);
    });

    it('dispatch with little subscriptions [tr]', () => {
      trSubscribtionsCallsCount = 0;
      const start = performance.now();

      storeTr.dispatch({ type: '101', payload: '1.11' });

      console.log(
        'dispatch with little subscriptions [tr]',
        (performance.now() - start).toFixed(3),'ms',
      );

      expect(trSubscribtionsCallsCount).toBe(1);
    });

    it('unsubscribe [redux]', () => {
      const start = performance.now();

      unsubscribersRedux.map(f => f())

      console.log('unsubscribe [redux]', (performance.now() - start).toFixed(3),'ms');
      // fill selectors cache
      storeRedux.dispatch({ type: '__none' });
    });

    it('unsubscribe [tr]', () => {
      const start = performance.now();

      unsubscribersTr.map(f => f())

      console.log('unsubscribe [tr]', (performance.now() - start).toFixed(3),'ms');
    });
  });
});

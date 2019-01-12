import { createStore } from 'redux';
import { __getId } from '@artalar/tr-reducer';

import { createCollection, tellChanges, composeEnhancers } from '..';

describe('tr-redux', () => {
  describe('createStore', () => {
    it('getState', () => {
      const child = createCollection(true).done();
      const root = createCollection()
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

      const reducer = createCollection({ prop: false })
        .on(change, (state, prop) => ({ prop }))
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

      const prop = createCollection(false)
        .on(changeProp, (state, value) => value)
        .done();
      const reducer = createCollection()
        .on(changeRoot, (state, data) => ({ ...state, ...data }))
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

      const list = createCollection([])
        .on(changeList, (state, data) => data)
        .on(changeItem, (state, { value, index }) =>
          tellChanges(state.map((v, i) => (i === index ? value : v)), [index]),
        )
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
});

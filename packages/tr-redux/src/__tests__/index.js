import { createReducer, createStore } from '..';

describe('tr-redux', () => {
  describe('createStore', () => {
    it('getState', () => {
      const child = createReducer(true).done();
      const root = createReducer()
        .compute({ child })
        .done();

      const store = createStore(root);

      expect(store.getState(child)).toBe(true);
      expect(store.getState(root)).toEqual({ child: true });
      expect(store.getState()).toEqual({ child: true });
    });

    it('getState lens', () => {
      const root = createReducer([1, 2, 3]).done();

      const store = createStore(root);

      expect(store.getState(root)).toEqual([1, 2, 3]);
      expect(store.getState(root, 0)).toEqual(1);
    });

    it('dispatch', () => {
      const change = 'CHANGE';

      const reducer = createReducer({ prop: false })
        .on(change, (state, prop) => ({ prop }))
        .done();

      const store = createStore(reducer);

      expect(store.getState()).toEqual({ prop: false });

      store.dispatch({ type: change, payload: true });

      expect(store.getState()).toEqual({ prop: true });
    });

    it('subscribe', () => {
      const changeProp = 'CHANGE_PROP';
      const changeRoot = 'CHANGE_ROOT';
      const rootSubscriber = jest.fn();
      const propSubscriber = jest.fn();

      const prop = createReducer(false)
        .on(changeProp, (state, value) => value)
        .done();
      const reducer = createReducer()
        .on(changeRoot, (state, data) => ({ ...state, ...data }))
        .compute({ prop })
        .done();

      const store = createStore(reducer);

      const rootSubscriberUnsubscribe = store.subscribe(rootSubscriber);
      const propSubscriberUnsubscribe = store.subscribe(propSubscriber, prop);

      expect(store.getState()).toEqual({ prop: false });

      store.dispatch({ type: changeProp, payload: true });

      expect(store.getState()).toEqual({ prop: true });

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

    it('subscribe to lens', () => {
      const changeList = 'CHANGE_LIST';
      const changeItem = 'CHANGE_ITEM';
      const listSubscriber = jest.fn();
      const firstItemSubscriber = jest.fn();
      const secondItemSubscriber = jest.fn();

      const list = createReducer([])
        .on(changeList, (state, list) => list)
        .lens(changeItem, (item, payload) => ({ ...item, ...payload }))
        .done();

      const store = createStore(list);

      const listSubscriberUnsubscribe = store.subscribe(listSubscriber);
      const firstItemSubscriberUnsubscribe = store.subscribe(
        firstItemSubscriber,
        list,
        0,
      );
      const secondItemUnsubscribe = store.subscribe(
        secondItemSubscriber,
        list,
        1,
      );

      expect(store.getState()).toEqual([]);

      store.dispatch({
        type: changeList,
        payload: [{ id: 0 }, { id: 1 }, { id: 2 }],
      });
      expect(store.getState()).toEqual([{ id: 0 }, { id: 1 }, { id: 2 }]);
      expect(listSubscriber.mock.calls.length).toBe(1);
      expect(listSubscriber.mock.calls[0][0]).toEqual([
        { id: 0 },
        { id: 1 },
        { id: 2 },
      ]);
      expect(firstItemSubscriber.mock.calls.length).toBe(1);
      expect(firstItemSubscriber.mock.calls[0][0]).toEqual({ id: 0 });
      expect(secondItemSubscriber.mock.calls.length).toBe(1);
      expect(secondItemSubscriber.mock.calls[0][0]).toEqual({ id: 1 });

      store.dispatch({
        type: changeItem,
        key: 0,
        payload: { value: true },
      });

      expect(store.getState()).toEqual([
        { id: 0, value: true },
        { id: 1 },
        { id: 2 },
      ]);
      expect(listSubscriber.mock.calls.length).toBe(2);
      expect(listSubscriber.mock.calls[1][0]).toEqual([
        { id: 0, value: true },
        { id: 1 },
        { id: 2 },
      ]);
      expect(firstItemSubscriber.mock.calls.length).toBe(2);
      expect(firstItemSubscriber.mock.calls[1][0]).toEqual({
        id: 0,
        value: true,
      });
      expect(secondItemSubscriber.mock.calls.length).toBe(1);

      listSubscriberUnsubscribe();
      firstItemSubscriberUnsubscribe();
      secondItemUnsubscribe();
      store.dispatch({
        type: changeList,
        payload: [{}, {}, {}],
      });
      expect(store.getState()).toEqual([{}, {}, {}]);
      expect(listSubscriber.mock.calls.length).toBe(2);
      expect(firstItemSubscriber.mock.calls.length).toBe(2);
      expect(secondItemSubscriber.mock.calls.length).toBe(1);
    });
  });
});

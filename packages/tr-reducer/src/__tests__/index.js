import { createCollection, __getId } from '..';

describe('Tr', () => {
  describe('API', () => {
    it('"create"', () => {
      expect(() => {
        createCollection();
      }).not.toThrow();

      expect(() => {
        createCollection('default value');
      }).not.toThrow();
    });

    it('"on"', () => {
      expect(() => {
        createCollection().on('', () => []);
      }).not.toThrow();
      expect(() => {
        createCollection().on(
          '',
          createCollection()
            .on('', () => [])
            .done(),
          () => [],
        );
      }).not.toThrow();

      {
        const childCollection = createCollection(0)
          .on('action', (state, payload) => [payload + 1])
          .done();
        const parentCollection = createCollection({})
          .on('action', childCollection, (state, payload, computedPayload) => [
            {
              state,
              payload,
              computedPayload,
            },
          ])
          .done();
        const rootCollection = createCollection({})
          .compute({ childCollection, parentCollection })
          .done();
        expect(
          rootCollection.build()(undefined, { type: 'action', payload: 1 }),
        ).toEqual({
          flat: {
            [__getId(childCollection)]: 2,
            [__getId(parentCollection)]: {
              state: {},
              payload: 1,
              computedPayload: 2,
            },
            [__getId(rootCollection)]: {
              childCollection: 2,
              parentCollection: { state: {}, payload: 1, computedPayload: 2 },
            },
          },
          root: {
            childCollection: 2,
            parentCollection: { state: {}, payload: 1, computedPayload: 2 },
          },
          changes: {
            [__getId(childCollection)]: [],
            [__getId(parentCollection)]: [],
            [__getId(rootCollection)]: [],
          },
        });
      }

      expect(() => createCollection().on()).toThrow();

      expect(() => createCollection().on('')).toThrow();

      expect(() => createCollection().on(undefined, () => [])).toThrow();

      expect(() =>
        createCollection().on(
          '',
          createCollection().on('', () => []),
          () => [],
        ),
      ).toThrow();
    });

    it('"compute", "done"', () => {
      expect(() => {
        createCollection().compute({ props: createCollection().done() });
      }).not.toThrow();

      expect(() => {
        createCollection().compute(createCollection().done(), () => []);
      }).not.toThrow();

      expect(() => {
        createCollection().compute(
          createCollection().done(),
          createCollection().done(),
          createCollection().done(),
          () => [],
        );
      }).not.toThrow();

      expect(
        createCollection({})
          .on('INIT', state => [state])
          .compute({
            child: createCollection(true)
              .on('INIT', (state = true) => [state])
              .done(),
          })
          .done()
          .build()(undefined, { type: 'INIT' }).root,
      ).toEqual({ child: true });

      expect(() => {
        createCollection().compute(createCollection(), () => []);
      }).toThrow();

      expect(() => {
        createCollection().compute(
          createCollection()
            .done()
            .build(),
          () => [],
        );
      }).toThrow();

      expect(() => {
        createCollection().compute(() => []);
      }).toThrow();

      expect(() => {
        createCollection().compute(createCollection());
      }).toThrow();
    });

    it('"build"', () => {
      expect(() => {
        createCollection()
          .on('', () => [])
          .done()
          .build();
      }).not.toThrow();

      expect(() => {
        createCollection()
          .on('', () => [])
          .build();
      }).toThrow();

      expect(() => {
        createCollection().build();
      }).toThrow();
    });
  });

  it('actions', () => {
    const INITIAL = 'INITIAL';
    const COUNT = 'COUNT';

    const counter1 = createCollection()
      .on(INITIAL, () => [0])
      .done();

    const counter2 = createCollection()
      .on(INITIAL, () => [0])
      .on(COUNT, (state, v) => [state + v])
      .done();

    const counter3 = createCollection(1)
      .on(COUNT, (state, v) => [state + v])
      .done();

    // eslint-disable-next-line
    test(
      createCollection()
        .compute({
          count1: counter1,
          count2: counter2,
          count3: counter3,
        })
        .done(),
    );

    // eslint-disable-next-line
    test(
      createCollection()
        .compute(
          counter1,
          counter2,
          counter3,
          (state, count1, count2, count3) => [
            {
              ...state,
              count1,
              count2,
              count3,
            },
          ],
        )
        .done(),
    );

    function test(counters) {
      const countersCollection = counters.build();

      let state;

      state = countersCollection(state, { type: INITIAL });
      expect(state.root).toEqual({
        count1: 0,
        count2: 0,
        count3: undefined,
      });

      state = countersCollection(state, { type: COUNT, payload: 1 });
      expect(state.root).toEqual({
        count1: 0,
        count2: 1,
        count3: 2,
      });

      state = countersCollection(state, { type: COUNT, payload: 1 });
      expect(state.root).toEqual({
        count1: 0,
        count2: 2,
        count3: 3,
      });
    }
  });

  it('tellChanges', () => {
    const fillList = 'FILL_LIST';
    const changeItem = 'CHANGE_ITEM';
    const changeItemSkip = 'CHANGE_ITEM_SKIP';

    const list = createCollection([])
      .on(fillList, (state, payload) => [payload])
      .on(changeItem, (state, { value, index }) => [
        state.map((v, i) => (i === index ? value : v)),
        [index],
      ])
      .on(changeItemSkip, () => [])
      .done();
    const listCollectionId = __getId(list);

    const reducer = list.build();

    let state;

    state = reducer(state, { type: fillList, payload: [1, 2, 3] });
    expect(state.root).toEqual([1, 2, 3]);

    state = reducer(state, {
      type: changeItem,
      payload: { value: 1.1, index: 0 },
    });
    expect(state.root).toEqual([1.1, 2, 3]);
    expect(state.changes[listCollectionId]).toEqual([0]);

    state = reducer(state, {
      type: changeItemSkip,
      payload: { value: 1.2, index: 0 },
    });
    expect(state.root).toEqual([1.1, 2, 3]);
    expect(listCollectionId in state.changes).toBe(false);
  });

  it('glitch free', () => {
    const testAction = 'testAction';
    const oneMap = jest.fn(() => [1]);
    const twoMap = jest.fn(() => [2]);
    const shape1Map = jest.fn((state, one, two) => [{ one, two }]);
    const shape2FirstComputeArgMap = jest.fn((state, v) => [v.one]);
    const shape2SecondComputeArgMap = jest.fn((state, v) => [v.two]);
    const shape2Map = jest.fn((state, one, two) => [{ one, two }]);

    const one = createCollection()
      .on(testAction, oneMap)
      .done();
    const two = createCollection()
      .on(testAction, twoMap)
      .done();

    const shape1 = createCollection({})
      .compute(one, two, shape1Map)
      .done();

    const shape2 = createCollection({})
      .compute(
        createCollection()
          .compute(shape1, shape2FirstComputeArgMap)
          .done(),
        createCollection()
          .compute(shape1, shape2SecondComputeArgMap)
          .done(),
        shape2Map,
      )
      .done();

    const reducer = shape2.build();

    expect(reducer(undefined, { type: testAction }).root).toEqual({
      one: 1,
      two: 2,
    });
    expect(oneMap.mock.calls.length).toBe(1);
    expect(twoMap.mock.calls.length).toBe(1);
    expect(shape1Map.mock.calls.length).toBe(1);
    expect(shape2FirstComputeArgMap.mock.calls.length).toBe(1);
    expect(shape2SecondComputeArgMap.mock.calls.length).toBe(1);
    expect(shape2Map.mock.calls.length).toBe(1);
  });
});

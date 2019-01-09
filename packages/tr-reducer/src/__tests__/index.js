import { createReducer, getId, getGetter } from '..';

const createContext = () => ({
  state: {},
  cache: {},
  changedIds: [],
});

describe('Tr', () => {
  describe('API', () => {
    it('create', () => {
      expect(() => {
        createReducer();
      }).not.toThrow();

      expect(() => {
        createReducer('default value');
      }).not.toThrow();
    });

    it('"on"', () => {
      expect(() => {
        createReducer().on('', () => {});
      }).not.toThrow();
      expect(() => {
        createReducer().on(
          '',
          createReducer()
            .on('', () => {})
            .done(),
          () => {},
        );
      }).not.toThrow();

      {
        const childReducer = createReducer(0)
          .on('action', (state, payload) => payload + 1)
          .done();
        const parentReducer = createReducer({})
          .on('action', childReducer, (state, payload, computedPayload) => ({
            state,
            payload,
            computedPayload,
          }))
          .done();
        expect(
          createReducer({})
            .compute({ childReducer, parentReducer })
            .done()
            .build()(createContext(), { type: 'action', payload: 1 }),
        ).toEqual({
          childReducer: 2,
          parentReducer: { state: {}, payload: 1, computedPayload: 2 },
        });
      }

      expect(() => {
        createReducer().on();
      }).toThrow();

      expect(() => {
        createReducer().on('');
      }).toThrow();

      expect(() => {
        createReducer().on(undefined, () => {});
      }).toThrow();
      expect(() => {
        createReducer().on('', createReducer().on('', () => {}), () => {});
      }).toThrow();
    });

    it('"lens"', () => {
      expect(() => {
        createReducer().lens('', () => {});
      }).not.toThrow();

      expect(() => {
        createReducer().lens('', () => {}, { set() {}, get() {} });
      }).not.toThrow();

      expect(() =>
        createReducer([0])
          .lens('string', (s, v) => v)
          .done()
          .build()(createContext(), { type: 'string', key: 0, payload: 1 }),
      ).not.toThrow();

      expect(
        createReducer([0])
          .lens('string', (s, v) => v)
          .done()
          .build()(createContext(), { type: 'string', key: 0, payload: 1 }),
      ).toEqual([1]);

      expect(() => {
        createReducer().lens();
      }).toThrow();

      expect(() => {
        createReducer().lens('');
      }).toThrow();

      expect(() => {
        createReducer().lens(undefined, () => {});
      }).toThrow();

      expect(() => {
        createReducer([0])
          .lens('string', (s, v) => v)
          .done()
          .build()(createContext(), { type: 'string', payload: 1 });
      }).toThrow();
    });

    it('"compute", "done"', () => {
      expect(() => {
        createReducer().compute({ props: createReducer().done() });
      }).not.toThrow();

      expect(() => {
        createReducer().compute(createReducer().done(), () => {});
      }).not.toThrow();

      expect(() => {
        createReducer().compute(
          createReducer().done(),
          createReducer().done(),
          createReducer().done(),
          () => {},
        );
      }).not.toThrow();

      expect(() => {
        createReducer().compute(createReducer(), () => {});
      }).toThrow();

      expect(() => {
        createReducer().compute(
          createReducer()
            .done()
            .build(),
          () => {},
        );
      }).toThrow();

      expect(() => {
        createReducer().compute(() => {});
      }).toThrow();

      expect(() => {
        createReducer().compute(createReducer());
      }).toThrow();
    });

    it('"build"', () => {
      expect(() => {
        createReducer()
          .on('', () => {})
          .done()
          .build();
      }).not.toThrow();

      expect(() => {
        createReducer()
          .on('', () => {})
          .build();
      }).toThrow();

      expect(() => {
        createReducer().build();
      }).toThrow();
    });
  });
  it('actions', () => {
    const INITIAL = 'INITIAL';
    const COUNT = 'COUNT';

    const counter1 = createReducer()
      .on(INITIAL, () => 0)
      .done();

    const counter2 = createReducer()
      .on(INITIAL, () => 0)
      .on(COUNT, (state, v) => state + v)
      .done();

    const counter3 = createReducer(1)
      .on(COUNT, (state, v) => state + v)
      .done();

    // eslint-disable-next-line
    test(
      createReducer()
        .compute({
          count1: counter1,
          count2: counter2,
          count3: counter3,
        })
        .done(),
    );

    // eslint-disable-next-line
    test(
      createReducer()
        .compute(
          counter1,
          counter2,
          counter3,
          (state, count1, count2, count3) => ({
            ...state,
            count1,
            count2,
            count3,
          }),
        )
        .done(),
    );

    function test(counters) {
      const countersReducer = counters.build();

      const context = createContext();

      expect(countersReducer(context, { type: INITIAL })).toEqual({
        count1: 0,
        count2: 0,
        count3: undefined,
      });
      context.state = Object.assign({}, context.cache);
      context.cache = {};
      context.changedIds = [];

      expect(countersReducer(context, { type: COUNT, payload: 1 })).toEqual({
        count1: 0,
        count2: 1,
        count3: 2,
      });
      context.state = Object.assign({}, context.state, context.cache);
      context.cache = {};
      context.changedIds = [];

      expect(countersReducer(context, { type: COUNT, payload: 1 })).toEqual({
        count1: 0,
        count2: 2,
        count3: 3,
      });
    }
  });

  describe('lens', () => {
    it('default lens', () => {
      const fillList = 'FILL_LIST';
      const changeItem = 'CHANGE_ITEM';

      const list = createReducer([])
        .on(fillList, (state, payload) => payload)
        .lens(changeItem, (itemState, payload) => payload)
        .done();
      const listReducerId = getId(list);

      const reducer = list.build();

      const context = createContext();

      reducer(context, { type: fillList, payload: [1, 2, 3] });
      expect(context.cache[listReducerId]).toEqual([1, 2, 3]);
      Object.assign(context.state, context.cache);
      context.cache = {};
      context.changedIds = [];

      reducer(context, { type: changeItem, key: 0, payload: 1.1 });
      expect(context.cache[listReducerId]).toEqual([1.1, 2, 3]);
      expect(context.changedIds).toEqual([{ id: listReducerId, key: 0 }]);
      expect(getGetter(list)(context.cache[listReducerId], 0)).toEqual(1.1);
    });

    it('custom lens', () => {
      const fillList = 'FILL_LIST';
      const changeItem = 'CHANGE_ITEM';

      const list = createReducer(new Map(), {
        get: (state, key) => state.get(key),
        set: (state, key, payload) => new Map(state).set(key, payload),
      })
        .on(fillList, (state, payload) => payload)
        .lens(changeItem, (itemState, payload) => payload)
        .done();
      const listReducerId = getId(list);

      const reducer = list.build();

      const context = createContext();

      const newList = new Map([[1, 1], [2, 2], [3, 3]]);
      reducer(context, { type: fillList, payload: newList });
      expect(context.cache[listReducerId]).toEqual(newList);
      expect(context.changedIds).toEqual([listReducerId]);
      Object.assign(context.state, context.cache);
      context.cache = {};
      context.changedIds = [];

      reducer(context, { type: changeItem, key: 1, payload: 1.1 });
      expect(context.cache[listReducerId]).toEqual(
        new Map([[1, 1.1], [2, 2], [3, 3]]),
      );
      expect(context.changedIds).toEqual([{ id: listReducerId, key: 1 }]);
      expect(getGetter(list)(context.cache[listReducerId], 1)).toEqual(1.1);
    });

    it('glitch free', () => {
      const testAction = 'testAction';
      const oneMap = jest.fn(() => 1);
      const twoMap = jest.fn(() => 2);
      const shape1Map = jest.fn((state, one, two) => ({ one, two }));
      const shape2FirstComputeArgMap = jest.fn((state, v) => v.one);
      const shape2SecondComputeArgMap = jest.fn((state, v) => v.two);
      const shape2Map = jest.fn((state, one, two) => ({ one, two }));

      const one = createReducer()
        .on(testAction, oneMap)
        .done();
      const two = createReducer()
        .on(testAction, twoMap)
        .done();

      const shape1 = createReducer({})
        .compute(one, two, shape1Map)
        .done();

      const shape2 = createReducer({})
        .compute(
          createReducer()
            .compute(shape1, shape2FirstComputeArgMap)
            .done(),
          createReducer()
            .compute(shape1, shape2SecondComputeArgMap)
            .done(),
          shape2Map,
        )
        .done();

      const reducer = shape2.build();

      const context = createContext();
      expect(reducer(context, { type: testAction })).toEqual({
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
});

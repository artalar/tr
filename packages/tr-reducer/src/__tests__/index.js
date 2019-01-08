import { createReducer, getId } from '..';

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
        createReducer().on();
      }).toThrow();

      expect(() => {
        createReducer().on('');
      }).toThrow();

      expect(() => {
        createReducer().on(undefined, () => {});
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

    test(
      createReducer()
        .compute({
          count1: counter1,
          count2: counter2,
          count3: counter3,
        })
        .done(),
    );

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
      expect(context.changedIds).toEqual([listReducerId]);
      Object.assign(context.state, context.cache);
      context.cache = {};
      context.changedIds = [];

      reducer(context, { type: changeItem, key: 0, payload: 1.1 });
      expect(context.cache[listReducerId]).toEqual([1.1, 2, 3]);
      expect(context.changedIds).toEqual([
        { id: listReducerId, key: 0, get: expect.any(Function) },
      ]);
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
      expect(context.changedIds).toEqual([
        { id: listReducerId, key: 1, get: expect.any(Function) },
      ]);
    });
  });
});

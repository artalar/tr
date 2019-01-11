import { createReducer, getId, getGetter } from '..';

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
            .build()(undefined, { type: 'action', payload: 1 }),
        ).toEqual({
          flat: expect.any(Object),
          root: {
            childReducer: 2,
            parentReducer: { state: {}, payload: 1, computedPayload: 2 },
          },
          changes: expect.any(Array),
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
          .build()(undefined, { type: 'string', key: 0, payload: 1 }),
      ).not.toThrow();

      expect(
        createReducer([0])
          .lens('string', (s, v) => v)
          .done()
          .build()(undefined, { type: 'string', key: 0, payload: 1 }),
      ).toEqual({
        flat: expect.any(Object),
        root: [1],
        changes: expect.any(Array),
      });

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
          .build()(undefined, { type: 'string', payload: 1 });
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

      expect(
        createReducer({})
          .on('INIT', state => state)
          .compute({
            child: createReducer(true)
              .on('INIT', (state = true) => state)
              .done(),
          })
          .done()
          .build()(undefined, { type: 'INIT' }).root,
      ).toEqual({ child: true });

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

      let state;

      state = countersReducer(state, { type: INITIAL });
      expect(state.root).toEqual({
        count1: 0,
        count2: 0,
        count3: undefined,
      });

      state = countersReducer(state, { type: COUNT, payload: 1 });
      expect(state.root).toEqual({
        count1: 0,
        count2: 1,
        count3: 2,
      });

      state = countersReducer(state, { type: COUNT, payload: 1 });
      expect(state.root).toEqual({
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

      let state;

      state = reducer(state, { type: fillList, payload: [1, 2, 3] });
      expect(state.flat[listReducerId]).toEqual([1, 2, 3]);

      state = reducer(state, { type: changeItem, key: 0, payload: 1.1 });
      expect(state.flat[listReducerId]).toEqual([1.1, 2, 3]);
      expect(state.changes).toEqual([{ id: listReducerId, key: 0 }]);
      expect(getGetter(list)(state.flat[listReducerId], 0)).toEqual(1.1);
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

      let state;

      const newList = new Map([[1, 1], [2, 2], [3, 3]]);
      state = reducer(state, { type: fillList, payload: newList });
      expect(state.flat[listReducerId]).toEqual(newList);
      expect(state.changes).toEqual([listReducerId]);

      state = reducer(state, { type: changeItem, key: 1, payload: 1.1 });
      expect(state.flat[listReducerId]).toEqual(
        new Map([[1, 1.1], [2, 2], [3, 3]]),
      );
      expect(state.changes).toEqual([{ id: listReducerId, key: 1 }]);
      expect(getGetter(list)(state.flat[listReducerId], 1)).toEqual(1.1);
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
});

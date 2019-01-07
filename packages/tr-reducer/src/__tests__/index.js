import { createReducer } from '..';

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

      const context = {
        state: {},
        cache: {},
        changedIds: [],
      };

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
});

import { createReducer, createStore } from '..';

describe('Tr', () => {
  it('should work', () => {
    const trackCounter3 = jest.fn();
    const trackCounters = jest.fn();

    const counter1 = createReducer()
      .on('initial', () => 0)
      .on('count', (state, v) => state + v)
      .done();

    const counter2 = createReducer()
      .on('initial', () => 0)
      .on('count', (state, v) => state + v)
      .done();

    const counter3 = createReducer() //
      .on('initial', () => 0)
      .done();

    const counters = createReducer() //
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
      .done();

    const store = createStore(counters);

    store.subscribe(trackCounters);
    store.subscribe(trackCounter3, counter3);

    store.dispatch({ type: 'initial' });
    expect(store.getState()).toEqual({
      count1: 0,
      count2: 0,
      count3: 0,
    });

    store.dispatch({ type: 'count', payload: 1 });
    expect(store.getState()).toEqual({
      count1: 1,
      count2: 1,
      count3: 0,
    });

    store.dispatch({ type: 'count', payload: 1 });
    expect(store.getState()).toEqual({
      count1: 2,
      count2: 2,
      count3: 0,
    });

    expect(trackCounter3.mock.calls.length).toBe(1);
    expect(trackCounters.mock.calls.length).toBe(3);
    expect(trackCounters.mock.calls[2][0]).toEqual({
      count1: 2,
      count2: 2,
      count3: 0,
    });
  });

  describe('rhombus reference', () => {
    const NAME = 'NAME';

    const firstName$ = createReducer()
      .on(NAME, (_, name) => name.split(' ')[0])
      .done();
    const lastName$ = createReducer()
      .on(NAME, (_, name) => name.split(' ')[1])
      .done();
    const fullName$ = createReducer()
      .compute(firstName$, lastName$, (_, fn, ln) => [fn, ln].join(' '))
      .done();

    const displayName$ = createReducer()
      .compute(firstName$, fullName$, (_, firstN, fullN) =>
        firstN.length < 10 ? fullN : firstN,
      )
      .done();

    const store = createStore(displayName$);

    const track = jest.fn();
    store.subscribe(track);

    store.dispatch({ type: 'NAME', payload: 'John Doe' });
    expect(track.mock.calls[0][0]).toBe('John Doe');

    store.dispatch({ type: 'NAME', payload: 'Jooooooooooooohn Doe' });
    expect(track.mock.calls[1][0]).toBe('Jooooooooooooohn');
  });

  describe('rhombus all tracks', () => {
    let NAME;
    let firstNameTrack;
    let firstName$;
    let lastName$;
    let fullNameTrack;
    let fullName$;
    let displayNameTrack;
    let displayName$;
    let store;

    it('create', () => {
      NAME = 'NAME';

      firstNameTrack = jest.fn((_, name) => name.split(' ')[0]);
      firstName$ = createReducer()
        .on(NAME, firstNameTrack)
        .done();

      lastName$ = createReducer()
        .on(NAME, (_, name) => name.split(' ')[1])
        .done();

      fullNameTrack = jest.fn((_, fn, ln) => [fn, ln].join(' '));
      fullName$ = createReducer()
        .compute(firstName$, lastName$, fullNameTrack)
        .done();

      displayNameTrack = jest.fn((_, firstN, fullN) =>
        firstN.length < 10 ? fullN : firstN,
      );
      displayName$ = createReducer()
        .compute(firstName$, fullName$, displayNameTrack)
        .done();

      store = createStore(displayName$);
    });

    it('update', () => {
      store.dispatch({ type: 'NAME', payload: 'John Doe' });
      expect(store.getState()).toBe('John Doe');
      expect(fullNameTrack.mock.calls.length).toBe(1);
      expect(displayNameTrack.mock.calls.length).toBe(1);

      store.dispatch({ type: 'NAME', payload: 'Jooooooooooooohn Doe' });
      expect(store.getState()).toBe('Jooooooooooooohn');
      expect(firstNameTrack.mock.calls.length).toBe(2);
      expect(fullNameTrack.mock.calls.length).toBe(2);
      expect(displayNameTrack.mock.calls.length).toBe(2);
    });
  });
});

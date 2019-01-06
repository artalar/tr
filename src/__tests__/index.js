import { Tr, createStore } from '..';

describe('Tr', () => {
  it('should work', () => {
    const trackCounter3 = jest.fn();
    const trackCounters = jest.fn();

    const counter1 = new Tr()
      .on('initial', () => 0)
      .on('count', (state, v) => state + v);

    const counter2 = new Tr()
      .on('initial', () => 0)
      .on('count', (state, v) => state + v);

    const counter3 = new Tr() //
      .on('initial', () => 0);

    const counters = new Tr() //
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
      );

    const store = createStore(counters);

    store.subscribe(trackCounters, counters);
    store.subscribe(trackCounter3, counter3);

    expect(store.dispatch('initial')).toEqual({
      count1: 0,
      count2: 0,
      count3: 0,
    });

    expect(store.dispatch('count', 1)).toEqual({
      count1: 1,
      count2: 1,
      count3: 0,
    });

    expect(store.dispatch('count', 1)).toEqual({
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

    const firstName$ = new Tr().on(NAME, (_, name) => name.split(' ')[0]);
    const lastName$ = new Tr().on(NAME, (_, name) => name.split(' ')[1]);
    const fullName$ = new Tr().compute(firstName$, lastName$, (_, fn, ln) =>
      [fn, ln].join(' '),
    );

    const displayName$ = new Tr().compute(
      firstName$,
      fullName$,
      (_, firstN, fullN) => (firstN.length < 10 ? fullN : firstN),
    );

    const store = createStore(displayName$);

    const track = jest.fn();
    store.subscribe(track, displayName$);

    store.dispatch('NAME', 'John Doe');
    expect(track.mock.calls[0][0]).toBe('John Doe');

    store.dispatch('NAME', 'Jooooooooooooohn Doe');
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
      firstName$ = new Tr().on(NAME, firstNameTrack);

      lastName$ = new Tr().on(NAME, (_, name) => name.split(' ')[1]);

      fullNameTrack = jest.fn((_, fn, ln) => [fn, ln].join(' '));
      fullName$ = new Tr().compute(firstName$, lastName$, fullNameTrack);

      displayNameTrack = jest.fn((_, firstN, fullN) =>
        firstN.length < 10 ? fullN : firstN,
      );
      displayName$ = new Tr().compute(firstName$, fullName$, displayNameTrack);

      store = createStore(displayName$);
    });

    it('update', () => {
      expect(store.dispatch('NAME', 'John Doe')).toBe('John Doe');
      expect(fullNameTrack.mock.calls.length).toBe(1);
      expect(displayNameTrack.mock.calls.length).toBe(1);

      expect(store.dispatch('NAME', 'Jooooooooooooohn Doe')).toBe(
        'Jooooooooooooohn',
      );
      expect(firstNameTrack.mock.calls.length).toBe(2);
      expect(fullNameTrack.mock.calls.length).toBe(2);
      expect(displayNameTrack.mock.calls.length).toBe(2);
    });
  });
});

import {
  createCaller,
  combine,
  createHandler,
  handleSnapshot,
  getValueFromSnapshot,
} from '..';

describe('tr', () => {
  describe('rhombus', () => {
    let name$;
    let firstNameTrack;
    let firstName$;
    let lastName$;
    let fullNameTrack;
    let fullName$;
    let displayNameTrack;
    let displayName$;
    let displayName;

    it('create', () => {
      name$ = createCaller();

      firstNameTrack = jest.fn((_, name) => name.split(' ')[0]);
      firstName$ = combine([name$], firstNameTrack);

      lastName$ = combine([name$], (_, name) => name.split(' ')[1]);

      fullNameTrack = jest.fn((_, fn, ln) => [fn, ln].join(' '));
      fullName$ = combine([firstName$, lastName$], fullNameTrack);

      displayNameTrack = jest.fn((_, firstN, fullN) =>
        firstN.length < 10 ? fullN : firstN,
      );
      displayName$ = combine([firstName$, fullName$], displayNameTrack);

      combine([displayName$], (_, v) => (displayName = v));
    });

    it('update', () => {
      name$('John Doe');
      expect(displayName).toBe('John Doe');
      expect(fullNameTrack.mock.calls.length).toBe(1);
      expect(displayNameTrack.mock.calls.length).toBe(1);

      name$('Jooooooooooooohn Doe');
      expect(displayName).toBe('Jooooooooooooohn');
      expect(firstNameTrack.mock.calls.length).toBe(2);
      expect(fullNameTrack.mock.calls.length).toBe(2);
      expect(displayNameTrack.mock.calls.length).toBe(2);
    });
  });

  describe('createHandler', () => {
    describe('union', async () => {
      async function fetch(fetcher) {
        fetchReq$(null, lastShapshot);
        try {
          fetchRes$(await fetcher, lastShapshot);
        } catch (e) {
          fetchErr$(e, lastShapshot);
        }
      }

      const initial$ = createCaller();

      const fetchReq$ = createCaller();
      const fetchRes$ = createCaller();
      const fetchErr$ = createCaller();

      const user$ = createHandler()
        .on([initial$], () => ({
          data: {},
          error: null,
          loading: true,
        }))
        .on([fetchReq$], state => ({
          ...state,
          error: null,
          loading: true,
        }))
        .on([fetchRes$], (state, data) => ({
          ...state,
          data,
          error: null,
          loading: false,
        }))
        .on([fetchErr$], (state, error) => ({
          ...state,
          error,
          data: {},
          loading: false,
        }))
        .done();

      const root$Track = jest.fn((_, user) => ({ user }));
      const root$ = combine([user$], root$Track);

      let lastShapshot;
      handleSnapshot(root$, ctx => (lastShapshot = ctx));

      it('initial', () => {
        initial$();
        expect(root$Track.mock.calls.length).toBe(1);
        expect(root$Track.mock.calls[0]).toEqual([
          undefined,
          { data: {}, error: null, loading: true },
        ]);
        expect(root$Track.mock.calls[0][1]).toEqual(
          getValueFromSnapshot(lastShapshot, root$).user,
        );
      });

      it('request success', async () => {
        const request = fetch(
          new Promise(r => setTimeout(r, 50, { prop: true })),
        );
        expect(root$Track.mock.calls.length).toBe(2);
        expect(root$Track.mock.calls[1]).toEqual([
          { user: { data: {}, error: null, loading: true } },
          { data: {}, error: null, loading: true },
        ]);

        await request;
        expect(root$Track.mock.calls.length).toBe(3);
        expect(root$Track.mock.calls[2][1]).toEqual({
          data: { prop: true },
          error: null,
          loading: false,
        });
      });

      it('request error', async () => {
        await fetch(new Promise((_, r) => setTimeout(r, 50, 'test error')));
        expect(root$Track.mock.calls.length).toBe(5);
        expect(root$Track.mock.calls[4][1]).toEqual({
          data: {},
          error: 'test error',
          loading: false,
        });
      });
    });

    describe('separated', async () => {
      async function fetch(fetcher) {
        fetchReq$(null, lastShapshot);
        try {
          fetchRes$(await fetcher, lastShapshot);
        } catch (e) {
          fetchErr$(e, lastShapshot);
        }
      }

      const initial$ = createCaller();

      const fetchReq$ = createCaller();
      const fetchRes$ = createCaller();
      const fetchErr$ = createCaller();

      const loading$ = createHandler()
        .on([initial$], () => true)
        .on([fetchReq$], () => true)
        .on([fetchRes$], () => false)
        .on([fetchErr$], () => false)
        .done();

      const error$ = createHandler()
        .on([initial$], () => null)
        .on([fetchReq$], () => null)
        .on([fetchRes$], () => null)
        .on([fetchErr$], (_, e) => e)
        .done();

      const userData$ = createHandler()
        .on([initial$], () => ({}))
        .on([fetchRes$], Object.assign)
        .on([fetchErr$], () => ({}))
        .done();

      const user$ = combine(
        [loading$, userData$, error$],
        (_, loading, data, error) => ({
          loading,
          data,
          error,
        }),
      );

      const root$Track = jest.fn((_, user) => ({ user }));
      const root$ = combine([user$], root$Track);

      let lastShapshot;
      handleSnapshot(root$, ctx => (lastShapshot = ctx));

      it('initial', () => {
        initial$();
        expect(root$Track.mock.calls.length).toBe(1);
        expect(root$Track.mock.calls[0]).toEqual([
          undefined,
          { data: {}, error: null, loading: true },
        ]);
        expect(root$Track.mock.calls[0][1]).toEqual(
          getValueFromSnapshot(lastShapshot, root$).user,
        );
      });

      it('request success', async () => {
        const request = fetch(
          new Promise(r => setTimeout(r, 50, { prop: true })),
        );
        expect(root$Track.mock.calls.length).toBe(2);
        expect(root$Track.mock.calls[1]).toEqual([
          { user: { data: {}, error: null, loading: true } },
          { data: {}, error: null, loading: true },
        ]);

        await request;
        expect(root$Track.mock.calls.length).toBe(3);
        expect(root$Track.mock.calls[2][1]).toEqual({
          data: { prop: true },
          error: null,
          loading: false,
        });
      });

      it('request error', async () => {
        await fetch(new Promise((_, r) => setTimeout(r, 50, 'test error')));
        expect(root$Track.mock.calls.length).toBe(5);
        expect(root$Track.mock.calls[4][1]).toEqual({
          data: {},
          error: 'test error',
          loading: false,
        });
      });
    });
  });
});

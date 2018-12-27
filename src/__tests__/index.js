import { EntryPoint, Node } from '..';

// class Store {
//   constructor(dependency) {
//     this._subscriptions = new Set();
//     dependency.add(state => this._notyfy(state));
//   }

//   _notyfy(state) {
//     this._subscriptions.forEach(cb => cb(state));
//   }

//   subscribe(callback) {
//     validateFunction(callback, 'callback');

//     this._subscriptions.add(callback);

//     return () => this._subscriptions.delete(callback);
//   }
// }

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
      name$ = new EntryPoint();

      firstNameTrack = jest.fn(name => name.split(' ')[0]);
      firstName$ = new Node([name$], firstNameTrack);

      lastName$ = new Node([name$], name => name.split(' ')[1]);

      fullNameTrack = jest.fn((fn, ln) => [fn, ln].join(' '));
      fullName$ = new Node([firstName$, lastName$], fullNameTrack);

      displayNameTrack = jest.fn((firstN, fullN) =>
        firstN.length < 10 ? fullN : firstN,
      );
      displayName$ = new Node([firstName$, fullName$], displayNameTrack);

      displayName$.add(ctx => {
        displayName = ctx[displayName$.type];
        return ctx;
      });
    });

    it('update', () => {
      name$.call('John Doe');
      expect(displayName).toBe('John Doe');
      expect(fullNameTrack.mock.calls.length).toBe(1);
      expect(displayNameTrack.mock.calls.length).toBe(1);

      name$.call('John Doe');
      expect(displayName).toBe('John Doe');
      expect(firstNameTrack.mock.calls.length).toBe(2);
      expect(fullNameTrack.mock.calls.length).toBe(2);
      expect(displayNameTrack.mock.calls.length).toBe(2);
    });
  });

  describe('pickFirst', () => {
    it('', async () => {
      const pickFirst = (...nodes) =>
        new Node(nodes, (...results) => results.find(Boolean));

      const fetch$ = {
        req: new EntryPoint(),
        res: new EntryPoint(),
        err: new EntryPoint(),
      };

      const loading$ = pickFirst(
        new Node([fetch$.req], () => true),
        new Node([fetch$.res], () => false),
        new Node([fetch$.err], () => false),
      );

      const userData$ = new Node([fetch$.res], (data = {}) => data);

      const user$ = new Node([loading$, userData$], (loading, user) => ({
        loading,
        user,
      }));

      async function fetch(fetcher) {
        fetch$.req.call();
        try {
          fetch$.res.call(await fetcher);
        } catch (e) {
          fetch$.err.call();
        }
      }
      const track = jest.fn();

      user$.add(ctx => track(ctx[user$.type]));

      await fetch(new Promise(r => setTimeout(r, 50, { prop: true })));

      console.log(track.mock.calls);
    });
  });

  // it('async', async () => {
  //   const { multiAtom } = new (withAtoms(PubSub))();
  //   const cb = jest.fn();

  //   const Status = multiAtom({
  //     status: 'idle',
  //   });

  //   const Data = Status.map(payload =>
  //     payload.status === 'res' ? payload.data : [],
  //   );

  //   const ErrorStatus = Status.map(payload =>
  //     payload.status === 'err' ? payload.error : null,
  //   );

  //   const Feature = multiAtom(Status, Data, ErrorStatus, (...v) => v);

  //   Feature.subscribe(data => {
  //     expect(data).toBe(Feature());
  //     cb(data);
  //   });

  //   async function updateUser(fetcher) {
  //     Status({ status: 'req' });
  //     try {
  //       Status({ status: 'res', data: await fetcher() });
  //     } catch (error) {
  //       Status({ status: 'err', error });
  //     }
  //   }

  //   await updateUser(() => new Promise(r => setTimeout(r, 50, [1, 2, 3])));

  //   expect(Data()).toEqual([1, 2, 3]);
  //   expect(Status().status).toEqual('res');
  //   expect(ErrorStatus()).toBe(null);
  //   expect(cb.mock.calls.length).toBe(2);
  //   expect(cb.mock.calls[0][0]).toEqual([{ status: 'req' }, [], null]);
  //   expect(cb.mock.calls[1][0]).toEqual([
  //     { status: 'res', data: [1, 2, 3] },
  //     [1, 2, 3],
  //     null,
  //   ]);
  // });
});

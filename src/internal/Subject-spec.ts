import { expect } from 'chai';
import { Subject, Observable, ObjectUnsubscribedError, of, isObservable } from 'rxjs';
import { TestScheduler } from 'rxjs/testing';
import { assertDeepEquals } from './test_helpers/assertDeepEquals';
import { isSubjectLike } from './util/isSubjectLike';

/** @test {Subject} */
describe('Subject', () => {
  let testScheduler: TestScheduler;

  beforeEach(() => {
    testScheduler = new TestScheduler(assertDeepEquals);
  });

  it('should pump values right on through itself', (done: MochaDone) => {
    const subject = new Subject<string>();
    const expected = ['foo', 'bar'];

    subject.subscribe({
      next: x => {
        expect(x).to.equal(expected.shift());
      },
      complete: done,
    });

    subject.next('foo');
    subject.next('bar');
    subject.complete();
  });

  it('should pump values to multiple subscribers', () => {
    const subject = new Subject<string>();
    const expected = ['foo', 'bar'];

    let i = 0;
    let j = 0;

    subject.subscribe(function (x) {
      expect(x).to.equal(expected[i++]);
    });

    subject.subscribe(function (x) {
      expect(x).to.equal(expected[j++]);
    });

    subject.next('foo');
    subject.next('bar');
    subject.complete();
  });

  it('should handle subscribers that arrive and leave at different times, ' +
  'subject does not complete', () => {
    const subject = new Subject<number>();
    const results1: (number | string)[] = [];
    const results2: (number | string)[] = [];
    const results3: (number | string)[] = [];

    subject.next(1);
    subject.next(2);
    subject.next(3);
    subject.next(4);

    const subscription1 = subject.subscribe({
      next: x => results1.push(x),
      error: () => results1.push('E'),
      complete: () => results1.push('C'),
    });

    subject.next(5);

    const subscription2 = subject.subscribe({
      next: x => results2.push(x),
      error: () => results2.push('E'),
      complete: () => results2.push('C'),
    });

    subject.next(6);
    subject.next(7);

    subscription1.unsubscribe();

    subject.next(8);

    subscription2.unsubscribe();

    subject.next(9);
    subject.next(10);

    const subscription3 = subject.subscribe({
      next: x => results3.push(x),
      error: () => results3.push('E'),
      complete: () => results3.push('C'),
    });

    subject.next(11);

    subscription3.unsubscribe();

    expect(results1).to.deep.equal([5, 6, 7]);
    expect(results2).to.deep.equal([6, 7, 8]);
    expect(results3).to.deep.equal([11]);
  });

  it('should handle subscribers that arrive and leave at different times, ' +
  'subject completes', () => {
    const subject = new Subject<number>();
    const results1: (number | string)[] = [];
    const results2: (number | string)[] = [];
    const results3: (number | string)[] = [];

    subject.next(1);
    subject.next(2);
    subject.next(3);
    subject.next(4);

    const subscription1 = subject.subscribe({
      next: x => results1.push(x),
      error: () => results1.push('E'),
      complete: () => results1.push('C'),
    });

    subject.next(5);

    const subscription2 = subject.subscribe({
      next: x => results2.push(x),
      error: () => results2.push('E'),
      complete: () => results2.push('C'),
    });

    subject.next(6);
    subject.next(7);

    subscription1.unsubscribe();

    subject.complete();

    subscription2.unsubscribe();

    const subscription3 = subject.subscribe({
      next: x => results3.push(x),
      error: () => results3.push('E'),
      complete: () => results3.push('C'),
    });

    subscription3.unsubscribe();

    expect(results1).to.deep.equal([5, 6, 7]);
    expect(results2).to.deep.equal([6, 7, 'C']);
    expect(results3).to.deep.equal(['C']);
  });

  it('should handle subscribers that arrive and leave at different times, ' +
  'subject terminates with an error', () => {
    const subject = new Subject<number>();
    const results1: (number | string)[] = [];
    const results2: (number | string)[] = [];
    const results3: (number | string)[] = [];

    subject.next(1);
    subject.next(2);
    subject.next(3);
    subject.next(4);

    const subscription1 = subject.subscribe({
      next: x => results1.push(x),
      error: () => results1.push('E'),
      complete: () => results1.push('C'),
    });

    subject.next(5);

    const subscription2 = subject.subscribe({
      next: x => results2.push(x),
      error: () => results2.push('E'),
      complete: () => results2.push('C'),
    });

    subject.next(6);
    subject.next(7);

    subscription1.unsubscribe();

    subject.error(new Error('err'));

    subscription2.unsubscribe();

    const subscription3 = subject.subscribe({
      next: x => results3.push(x),
      error: () => results3.push('E'),
      complete: () => results3.push('C'),
    });

    subscription3.unsubscribe();

    expect(results1).to.deep.equal([5, 6, 7]);
    expect(results2).to.deep.equal([6, 7, 'E']);
    expect(results3).to.deep.equal(['E']);
  });

  it('should handle subscribers that arrive and leave at different times, ' +
  'subject completes before nexting any value', () => {
    const subject = new Subject<number>();
    const results1: (number | string)[] = [];
    const results2: (number | string)[] = [];
    const results3: (number | string)[] = [];

    const subscription1 = subject.subscribe({
      next: x => results1.push(x),
      error: () => results1.push('E'),
      complete: () => results1.push('C'),
    });

    const subscription2 = subject.subscribe({
      next: x => results2.push(x),
      error: () => results2.push('E'),
      complete: () => results2.push('C'),
    });

    subscription1.unsubscribe();

    subject.complete();

    subscription2.unsubscribe();

    const subscription3 = subject.subscribe({
      next: x => results3.push(x),
      error: () => results3.push('E'),
      complete: () => results3.push('C'),
    });

    subscription3.unsubscribe();

    expect(results1).to.deep.equal([]);
    expect(results2).to.deep.equal(['C']);
    expect(results3).to.deep.equal(['C']);
  });

  it('should disallow new subscriber once subject has been disposed', () => {
    const subject = new Subject<number>();
    const results1: (number | string)[] = [];
    const results2: (number | string)[] = [];
    const results3: (number | string)[] = [];

    const subscription1 = subject.subscribe({
      next: x => results1.push(x),
      error: () => results1.push('E'),
      complete: () => results1.push('C'),
    });

    subject.next(1);
    subject.next(2);

    const subscription2 = subject.subscribe({
      next: x => results2.push(x),
      error: () => results2.push('E'),
      complete: () => results2.push('C'),
    });

    subject.next(3);
    subject.next(4);
    subject.next(5);

    subscription1.unsubscribe();
    subscription2.unsubscribe();
    subject.unsubscribe();

    expect(() => {
      subject.subscribe({
        next: x => results3.push(x),
        error: (err) => {
          expect(false).to.equal('should not throw error: ' + err.toString());
        }
      });
    }).to.throw(ObjectUnsubscribedError);

    expect(results1).to.deep.equal([1, 2, 3, 4, 5]);
    expect(results2).to.deep.equal([3, 4, 5]);
    expect(results3).to.deep.equal([]);
  });

  it('should not allow values to be nexted after it is unsubscribed', (done: MochaDone) => {
    const subject = new Subject();
    const expected = ['foo'];

    subject.subscribe(function (x) {
      expect(x).to.equal(expected.shift());
    });

    subject.next('foo');
    subject.unsubscribe();
    expect(() => subject.next('bar')).to.throw(ObjectUnsubscribedError);
    done();
  });

  // it('should work as a function to create a FrankenSubject', () => {
  //   expect(Subject).to.be.a('function');
  //   const source = of(1, 2, 3, 4, 5);
  //   const nexts: any[] = [];
  //   const output: number[] = [];

  //   let error: any;
  //   let complete = false;
  //   let outputComplete = false;

  //   const observer = {
  //     closed: false,
  //     next: function (x: string) {
  //       nexts.push(x);
  //     },
  //     error: function (err: any) {
  //       error = err;
  //       this.closed = true;
  //     },
  //     complete: function () {
  //       complete = true;
  //       this.closed = true;
  //     }
  //   };

  //   const sub = Subject(observer, source);

  //   sub.subscribe(function (x) {
  //     output.push(x);
  //   }, null, () => {
  //     outputComplete = true;
  //   });

  //   sub.next('a');
  //   sub.next('b');
  //   sub.next('c');
  //   sub.complete();

  //   expect(nexts).to.deep.equal(['a', 'b', 'c']);
  //   expect(complete).to.be.true;
  //   expect(error).to.be.a('undefined');

  //   expect(output).to.deep.equal([1, 2, 3, 4, 5]);
  //   expect(outputComplete).to.be.true;
  // });

  // it('should have a static create function that works also to raise errors', () => {
  //   expect(Subject).to.be.a('function');
  //   const source = of(1, 2, 3, 4, 5);
  //   const nexts: number[] = [];
  //   const output: number[] = [];

  //   let error: any;
  //   let complete = false;
  //   let outputComplete = false;

  //   const destination = {
  //     closed: false,
  //     next: function (x: number) {
  //       nexts.push(x);
  //     },
  //     error: function (err: any) {
  //       error = err;
  //       this.closed = true;
  //     },
  //     complete: function () {
  //       complete = true;
  //       this.closed = true;
  //     }
  //   };

  //   const sub = Subject(destination, source);

  //   sub.subscribe(function (x: number) {
  //     output.push(x);
  //   }, null, () => {
  //     outputComplete = true;
  //   });

  //   sub.next(1);
  //   sub.next(2);
  //   sub.next(3);
  //   sub.error('boom');

  //   expect(nexts).to.deep.equal([1, 2, 3]);
  //   expect(complete).to.be.false;
  //   expect(error).to.equal('boom');

  //   expect(output).to.deep.equal([1, 2, 3, 4, 5]);
  //   expect(outputComplete).to.be.true;
  // });

  it('should be an Observer which can be given to Observable.subscribe', (done: MochaDone) => {
    const source = of(1, 2, 3, 4, 5);
    const subject = new Subject();
    const expected = [1, 2, 3, 4, 5];

    subject.subscribe({
      next: x => {
        expect(x).to.equal(expected.shift());
      },
      error: () => {
        done(new Error('should not be called'));
      },
      complete: done,
    });

    source.subscribe(subject);
  });

  it('should throw ObjectUnsubscribedError when emit after unsubscribed', () => {
    const subject = new Subject();
    subject.unsubscribe();

    expect(function testNext() {
      subject.next('a');
    }).to.throw(ObjectUnsubscribedError);

    expect(function testError() {
      subject.error('a');
    }).to.throw(ObjectUnsubscribedError);

    expect(function testComplete() {
      subject.complete();
    }).to.throw(ObjectUnsubscribedError);
  });

  it('should not next after completed', () => {
    const subject = new Subject<string>();
    const results: string[] = [];
    subject.subscribe({
      next: x => results.push(x),
      complete: () => results.push('C'),
    });
    subject.next('a');
    subject.complete();
    subject.next('b');
    expect(results).to.deep.equal(['a', 'C']);
  });

  it('should not next after error', () => {
    const error = new Error('wut?');
    const subject = new Subject<string>();
    const results: string[] = [];
    subject.subscribe({
      next: x => results.push(x),
      error: (err) => results.push(err),
    });
    subject.next('a');
    subject.error(error);
    subject.next('b');
    expect(results).to.deep.equal(['a', error]);
  });

  describe('asObservable', () => {
    it('should hide subject', () => {
      const subject = new Subject();
      const observable = subject.asObservable();

      expect(subject).not.to.equal(observable);

      expect(isObservable(observable)).to.be.true;
      expect(isSubjectLike(observable)).to.be.false;
    });

    it('should handle subject never emits', () => {
      testScheduler.run(({ hot, cold, expectObservable, expectSubscriptionsTo }) => {
        const observable = hot('-').asObservable();

        expectObservable(observable).toBe('-');
      });
    });

    it('should handle subject completes without emits', () => {
      testScheduler.run(({ hot, cold, expectObservable, expectSubscriptionsTo }) => {
        const observable = hot('--^--|').asObservable();
        const expected =         '---|';

        expectObservable(observable).toBe(expected);
      });
    });

    it('should handle subject throws', () => {
      testScheduler.run(({ hot, cold, expectObservable, expectSubscriptionsTo }) => {
        const observable = hot('--^--#').asObservable();
        const expected =         '---#';

        expectObservable(observable).toBe(expected);
      });
    });

    it('should handle subject emits', () => {
      testScheduler.run(({ hot, cold, expectObservable, expectSubscriptionsTo }) => {
        const observable = hot('--^--x--|').asObservable();
        const expected =         '---x--|';

        expectObservable(observable).toBe(expected);
      });
    });
  });
});

// describe('FrankenSubject', () => {
//   it('should not be eager', () => {
//     let subscribed = false;

//     const subject = Subject(null, new Observable(observer => {
//       subscribed = true;
//       const subscription = of('x').subscribe(observer);
//       return () => {
//         subscription.unsubscribe();
//       };
//     }));

//     const observable = subject.asObservable();
//     expect(subscribed).to.be.false;

//     observable.subscribe();
//     expect(subscribed).to.be.true;
//   });
// });

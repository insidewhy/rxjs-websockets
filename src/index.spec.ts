import 'mocha'
import { TestScheduler } from 'rxjs/testing'
import { Observable, of } from 'rxjs'
import { delay, switchMapTo, catchError, switchMap } from 'rxjs/operators';
import { throwError } from 'rxjs/internal/observable/throwError';
import * as chai from 'chai'
import * as sinon from 'sinon'
import * as sinonChai from 'sinon-chai'

import connect from '.'

chai.use(sinonChai)
chai.should()

describe('rxjs-websockets', () => {
  let scheduler: TestScheduler
  let expect: typeof scheduler.expectObservable
  let flush: typeof scheduler.flush
  let cold: typeof scheduler.createColdObservable
  let hot: typeof scheduler.createHotObservable
  beforeEach(() => {
    scheduler = new TestScheduler(chai.assert.deepEqual)
    expect = scheduler.expectObservable.bind(scheduler)
    flush = scheduler.flush.bind(scheduler)
    cold = scheduler.createColdObservable.bind(scheduler)
    hot = scheduler.createHotObservable.bind(scheduler)
  })

  class MockSocket {
    onmessage: Function
    onopen: Function
    onclose: Function
    close = () => {}
    // forwards input as output
    send(data: string) { this.onmessage({ data }) }
  }

  const connectHelper = (mockSocket, protocols?) => connect('url', protocols, () => mockSocket)

  it('connects to websocket lazily and retrieves data', () => {
    const mockSocket = new MockSocket()
    const socket = connectHelper(mockSocket)
    const input = hot('abcde|')
    expect(
      of(null).pipe(
        // delay subscription to websocket by 10ms
        delay(10, scheduler),
        switchMap(() => {
          // ensure connection is made when subscribed to rather than when created
          chai.expect(scheduler.now()).to.equal(10)
          return socket.pipe(
            switchMap(factory => {
              // ensure factory is called when socket is open
              chai.expect(scheduler.now()).to.equal(20)
              return factory(input)
            })
          )
        })
      )
    ).toBe('--cde')

    // websocket opens at 20ms
    scheduler.schedule(() => {
      // if one of the expectations raises an error this won't be defined
      if (mockSocket.onopen)
        mockSocket.onopen()
    }, 20)

    flush()
  })

  /*

  /*
  it('closes websocket on unsubscribe', () => {
    const mockSocket = new class extends MockSocket {
      close = sinon.stub()
    }
    const { messages } = connectHelper(cold('a|'), mockSocket)
    scheduler.schedule(() => mockSocket.onopen(), 10)
    expect(messages, '--!').toBe('-a')
    flush()

    mockSocket.close.should.have.been.calledOnce
  })

  it('errors on unclean websocket close', () => {
    const mockSocket = new MockSocket()
    const { messages } = connectHelper(cold('a'), mockSocket)
    scheduler.schedule(() => mockSocket.onopen(), 10)
    scheduler.schedule(() => mockSocket.onclose({ reason: 'Normal closure' }), 30)
    expect(messages.pipe(catchError(error => throwError(error.message))))
      .toBe('-a-#', undefined, 'Normal closure')
    flush()
  })
  */
})

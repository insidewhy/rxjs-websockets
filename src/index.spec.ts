import 'mocha'
import 'rxjs'
import { TestScheduler } from 'rxjs/testing'
import { Observable, of } from 'rxjs'
import { delay, switchMapTo, catchError } from 'rxjs/operators';
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

  const connectHelper = (input, mockSocket, protocols?) => connect('url', input, protocols, () => mockSocket)

  it('connects to websocket lazily and retrieves data', () => {
    const mockSocket = new MockSocket()
    const { connectionStatus, messages } = connectHelper(hot('abcde|'), mockSocket)
    scheduler.schedule(() => mockSocket.onopen(), 15)
    expect(of(null).pipe(delay(14, scheduler)).pipe(switchMapTo(messages))).toBe('--cde')
    flush()
  })

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
})

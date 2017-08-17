import 'mocha'
import { TestScheduler } from 'rxjs/testing/TestScheduler'
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
  beforeEach(() => {
    scheduler = new TestScheduler(chai.assert.deepEqual)
    expect = scheduler.expectObservable.bind(scheduler)
    flush = scheduler.flush.bind(scheduler)
    cold = scheduler.createColdObservable.bind(scheduler)
  })

  it('connects to websocket lazily and retrieves data', () => {
    const input = cold('abc|')
    const close = sinon.stub()

    const mockSocket = new class {
      onmessage: Function
      onopen: Function
      onclose: Function
      close = sinon.stub()

      send(data: string) {
        this.onmessage({ data })
      }
    }
    const socketFactory = url => mockSocket

    const { connectionStatus, messages } = connect('url', input, socketFactory, false)
    expect(messages).toBe('-abc-|')
    scheduler.schedule(() => mockSocket.onopen(), 10)
    scheduler.schedule(() => mockSocket.onclose({ wasClean: true }), 50)
    flush()

    mockSocket.close.should.have.been.calledOnce
  })
})

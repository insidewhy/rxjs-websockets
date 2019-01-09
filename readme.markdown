# rxjs-websockets

[![build status](https://circleci.com/gh/ohjames/rxjs-websockets.png?style=shield)](https://circleci.com/gh/ohjames/rxjs-websockets)

An rxjs websocket library with a simple and flexible implementation. Supports the browser and node.js.

## Comparisons to other rxjs websocket libraries:

 * [observable-socket](https://github.com/killtheliterate/observable-socket)
   * observable-socket provides an input subject for the user, rxjs-websockets allows the user to supply the input stream as a parameter to allow the user to select an observable with semantics appropriate for their own use case ([queueing-subject](https://github.com/ohjames/queueing-subject) can be used to achieve the same semantics as observable-socket).
   * With observable-socket the WebSocket object must be used and managed by the user, rxjs-websocket manages the WebSocket(s) for the user lazily according to subscriptions to the messages observable.
   * With observable-socket the WebSocket object must be observed using plain old events to detect the connection status, rxjs-websockets provides the connection status as an observable.
 * [rxjs built-in websocket subject](https://github.com/ReactiveX/rxjs/blob/next/src/observable/dom/webSocket.ts)
   * Implemented as a Subject so lacks the flexibility that rxjs-websockets and observable-socket provide.
   * Does not provide any ability to monitor the web socket connection state.

## Installation

```bash
npm install -S rxjs-websockets
# or
yarn add rxjs-websockets
```

## Changelog

[Changelog here](changelog.markdown)

## Simple usage

```typescript
import { QueueingSubject } from 'queueing-subject'
import { share, switchMap } from 'rxjs/operators'
import websocketConnect from 'rxjs-websockets'

// this subject queues as necessary to ensure every message is delivered
const input$ = new QueueingSubject<string>()

// create the websocket observable, does *not* open the websocket connection
const socket$ = websocketConnect('ws://localhost/websocket-path')

const messages$ = socket$.pipe(
  switchMap(getResponses => {
    // The connection is attempted lazily, i.e. not when websocketConnect is
    // called but when socket$ is subscribed to.
    console.log('connected to websocket')
    return getResponses(input$)
  }),
  share(),
)

// send data to the server
input$.next('some data')

// the websocket connection is created during the `subscribe` call.
const messagesSubscription = messages.subscribe(
  (message: string) => {
    console.log('received message:', message)
    input$.next('i got your message')
  },
  (error: Error) => {
    console.log('an error occurred and the socket was disconnected', error)
  },
  () => {
    console.log('the connection was closed cleanly')
  },
)

function closeWebsocket() {
  // this closes the websocket
  messagesSubscription.unsubscribe()
}

setTimeout(closeWebsocket, 2000)
```

The observable returned by `websocketConnect` iis cold, this means the websocket connection is attempted lazily as subscriptions are made to it. Advanced users of this library will find it important to understand the distinction between [hot and cold observables](https://blog.thoughtram.io/angular/2016/06/16/cold-vs-hot-observables.html), for most it will be sufficient to use the [share operator](http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html#instance-method-share) as shown in the Angular example below.

The `share` operator is used to ensures at most one websocket connection is attempted regardless of the number of subscriptions to the observable. If only one subscription is made then the operator would have no effect.

## Reconnecting on failure

This can be done with the built-in rxjs operator `retryWhen`:

```typescript
import { Subject } from 'rxjs'
import { switchMap, retryWhen } from 'rxjs/operators'
import websocketConnect from 'rxjs-websockets'

const input$ = new Subject<string>()

const socket$ = websocketConnect('ws://localhost/websocket-path')

const messages$ = socket$.pipe(
  switchMap(getResponses => getResponses(input$)),
  retryWhen(errors => errors.pipe(delay(1000))),
)
```

## Alternate WebSocket implementations

A custom websocket factory function can be supplied that takes a URL and returns an object that is compatible with WebSocket:

```typescript
const socket$ = websocketConnect(
  'ws://127.0.0.1:4201/ws',

  // the optional protocols argument can be passed here and is forwarded to
  // the websocket
  undefined,

  // this is the factory
  (url, protocols) => new WebSocket(url, protocols)
)
```

## JSON messages and responses

This example shows how to use the `map` operator to handle JSON encoding of outgoing messages and parsing of responses:

```typescript
function jsonWebsocketConnect(
  url: string,
  input$: Observable<object>,
  protocols?: string | string[]
) {
  const jsonInput$ = input$.pipe(map(message => JSON.stringify(message)))
  const socket$ = websocketConnect(url, protocols)
  return socket$.pipe(
    map(getResponses =>
      input => getResponses(input).pipe(map(message => JSON.parse(message)))
    )
  )
}
```

The function above can be used identically to `websocketConnect` only the requests/responses will be transparently encoded/decoded.

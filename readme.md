# rxjs-websockets

[![build status](https://circleci.com/gh/insidewhy/rxjs-websockets.png?style=shield)](https://circleci.com/gh/insidewhy/rxjs-websockets)
[![Known Vulnerabilities](https://snyk.io/test/github/insidewhy/rxjs-websockets/badge.svg)](https://snyk.io/test/github/insidewhy/rxjs-websockets)
[![Renovate](https://img.shields.io/badge/renovate-enabled-brightgreen.svg)](https://renovatebot.com)

An rxjs websocket library with a simple and flexible implementation. Supports the browser and node.js.

## Comparisons to other rxjs websocket libraries:

- [observable-socket](https://github.com/killtheliterate/observable-socket)
  - observable-socket provides an input subject for the user, rxjs-websockets allows the user to supply the input stream as a parameter to allow the user to select an observable with semantics appropriate for their own use case ([queueing-subject](https://github.com/insidewhy/queueing-subject) can be used to achieve the same semantics as observable-socket).
  - With observable-socket the WebSocket object must be used and managed by the user, rxjs-websocket manages the WebSocket(s) for the user lazily according to subscriptions to the messages observable.
  - With observable-socket the WebSocket object must be observed using plain old events to detect the connection status, rxjs-websockets presents the connection status through observables.
- [rxjs built-in websocket subject](https://github.com/ReactiveX/rxjs/blob/next/src/observable/dom/webSocket.ts)
  - Implemented as a Subject so lacks the flexibility that rxjs-websockets and observable-socket provide.
  - Does not provide any ability to monitor the web socket connection state.

## Installation

```bash
npm install -S rxjs-websockets
# or
yarn add rxjs-websockets
```

For rxjs 6 support, rxjs-websockets 8 is needed.

```bash
npm install -S rxjs-websockets@8
# or
yarn add rxjs-websockets@8
```

## Changelog

[Changelog here](changelog.md)

## Simple usage

```typescript
import { QueueingSubject } from 'queueing-subject'
import { Subscription } from 'rxjs'
import { share, switchMap } from 'rxjs/operators'
import makeWebSocketObservable, {
  GetWebSocketResponses,
  // WebSocketPayload = string | ArrayBuffer | Blob
  WebSocketPayload,
  normalClosureMessage,
} from 'rxjs-websockets'

// this subject queues as necessary to ensure every message is delivered
const input$ = new QueueingSubject<string>()

// queue up a request to be sent when the websocket connects
input$.next('some data')

// create the websocket observable, does *not* open the websocket connection
const socket$ = makeWebSocketObservable('ws://localhost/websocket-path')

const messages$: Observable<WebSocketPayload> = socket$.pipe(
  // the observable produces a value once the websocket has been opened
  switchMap((getResponses: GetWebSocketResponses) => {
    console.log('websocket opened')
    return getResponses(input$)
  }),
  share(),
)

const messagesSubscription: Subscription = messages.subscribe(
  (message: string) => {
    console.log('received message:', message)
    // respond to server
    input$.next('i got your message')
  },
  (error: Error) => {
    const { message } = error
    if (message === normalClosureMessage) {
      console.log('server closed the websocket connection normally')
    } else {
      console.log('socket was disconnected due to error:', message)
    }
  },
  () => {
    // The clean termination only happens in response to the last
    // subscription to the observable being unsubscribed, any
    // other closure is considered an error.
    console.log('the connection was closed in response to the user')
  },
)

function closeWebsocket() {
  // this also caused the websocket connection to be closed
  messagesSubscription.unsubscribe()
}

setTimeout(closeWebsocket, 2000)
```

The observable returned by `makeWebSocketObservable` is cold, this means the websocket connection is attempted lazily as subscriptions are made to it. Advanced users of this library will find it important to understand the distinction between [hot and cold observables](https://blog.thoughtram.io/angular/2016/06/16/cold-vs-hot-observables.html), for most it will be sufficient to use the [share operator](http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html#instance-method-share) as shown in the example above. The `share` operator ensures at most one websocket connection is attempted regardless of the number of subscriptions to the observable while ensuring the socket is closed when the last subscription is unsubscribed. When only one subscription is made the operator has no effect.

By default the websocket supports binary messages so the payload type is `string | ArrayBuffer | Blob`, when you only need `string` messages the generic parameter to `makeWebSocketObservable` can be used:

```typescript
const socket$ = makeWebSocketObservable<string>('ws://localhost/websocket-path')
const input$ = new QueueingSubject<string>()

const messages$: Observable<string> = socket$.pipe(
  switchMap((getResponses: GetWebSocketResponses<string>) => getResponses(input$)),
  share(),
)
```

## Reconnecting on unexpected connection closures

This can be done with the built-in rxjs operator `retryWhen`:

```typescript
import { Subject } from 'rxjs'
import { switchMap, retryWhen } from 'rxjs/operators'
import makeWebSocketObservable from 'rxjs-websockets'

const input$ = new Subject<string>()

const socket$ = makeWebSocketObservable('ws://localhost/websocket-path')

const messages$ = socket$.pipe(
  switchMap((getResponses) => getResponses(input$)),
  retryWhen((errors) => errors.pipe(delay(1000))),
)
```

## Alternate WebSocket implementations

A custom websocket factory function can be supplied that takes a URL and returns an object that is compatible with WebSocket:

```typescript
import makeWebSocketObservable, { WebSocketOptions } from 'rxjs-websockets'

const options: WebSocketOptions = {
  // this is used to create the websocket compatible object,
  // the default is shown here
  makeWebSocket: (url: string, protocols?: string | string[]) => new WebSocket(url, protocols),

  // optional argument, passed to `makeWebSocket`
  // protocols: '...',
}

const socket$ = makeWebSocketObservable('ws://127.0.0.1:4201/ws', options)
```

## JSON messages and responses

This example shows how to use the `map` operator to handle JSON encoding of outgoing messages and parsing of responses:

```typescript
import { Observable } from 'rxjs'
import makeWebSocketObservable, { WebSocketOptions } from 'rxjs-websockets'

function makeJsonWebSocketObservable(
  url: string,
  options?: WebSocketOptions,
): Observable<unknown> {
  const socket$ = makeWebSocketObservable<string>(url, options)
  return socket$.pipe(
    map(
      (getResponses: GetWebSocketReponses<string>) => (input$: Observable<object>) =>
        getResponses(input$.pipe(map((request) => JSON.stringify(request)))).pipe(
          map((response) => JSON.parse(response)),
        ),
    ),
  )
}
```

The function above can be used identically to `makeWebSocketObservable` only the requests/responses will be transparently encoded/decoded.

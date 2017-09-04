# rxjs-websockets

[![build status](https://circleci.com/gh/ohjames/rxjs-websockets.png?style=shield)](https://circleci.com/gh/ohjames/rxjs-websockets)

An rxjs websocket library with a simple implementation built with flexibility in mind. Great for use with angular 2 or any other rxjs project. Supports the browser and node.js.

## Comparisons to other rxjs websocket libraries:

 * [observable-socket](https://github.com/killtheliterate/observable-socket) provides the input stream for the user, in rxjs-websockets the input stream is taken as a parameter allowing the user to choose the appropriate subject or observable for their needs. [queueing-subject](https://github.com/ohjames/queueing-subject) can be used to achieve the same semantics as observable-socket. rxjs-websockets exposes the websocket connection status as an observable, with observable-socket the WebSocket object must be used directly to listen for connection status changes.
 * [rxjs built-in websocket subject](https://github.com/ReactiveX/rxjs/blob/next/src/observable/dom/webSocket.ts): Implemented as a Subject so lacks the flexibility that rxjs-websockets and observable-socket provide. It does not provide any ability to monitor the web socket connection state.

## Installation

Install the dependency:

```bash
npm install -S rxjs-websockets
# the following dependency is recommended for most users
npm install -S queueing-subject
```

## Simple usage

```javascript
import { QueueingSubject } from 'queueing-subject'
import websocketConnect from 'rxjs-websockets'

// this subject queues as necessary to ensure every message is delivered
const input = new QueueingSubject<string>()

// this method returns an object which contains two observables
const { messages, connectionStatus } = websocketConnect('ws://localhost/websocket-path', input)

// send data to the server
input.next('some data')

// the connectionStatus stream will provides the current number of websocket
// connections immediately to each new observer and updates as it changes
const connectionStatusSubscription = connectionStatus.subscribe(numberConnected => {
  console.log('number of connected websockets:', numberConnected)
})

// the websocket connection is created lazily when the messages observable is
// subscribed to
const messagesSubscription = messages.subscribe((message: string) => {
  console.log('received message:', message)
})

// this will close the websocket
messagesSubscription.unsubscribe()

// closing the websocket does not close the connection status observable, it
// can be used to monitor future connection status changes
connectionStatusSubscription.unsubscribe()
```

`messages` is a cold observable, this means the websocket connection is attempted lazily when a subscription is made to the `messages` observable. Advanced users of this library will find it important to understand the distinction between [hot and cold observables](https://blog.thoughtram.io/angular/2016/06/16/cold-vs-hot-observables.html), for most it will be sufficient to use the [share operator](http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html#instance-method-share) as shown in the Angular example below.

## Reconnecting on failure

This can be done with built-in rxjs operators:

```javascript
const input = new QueueingSubject<string>()
const { messages, connectionStatus } = websocketConnect(`ws://server`, input)

// try to reconnect every second
messages.retryWhen(errors => errors.delay(1000)).subscribe(message => {
  console.log(message)
})
```

## Alternate WebSocket implementations

A custom websocket factory function can be supplied that takes a URL and returns an object that is compatible with WebSocket:

```javascript
const { messages } = websocketConnect(
  'ws://127.0.0.1:4201/ws',
  this.inputStream = new QueueingSubject<string>(),
  url => new WebSocket(url)
)
```

## JSON messages and responses

This function can be called instead of `websocketConnect`:

```javascript
function jsonWebsocketConnect(url: string, input: Observable<object>) {
  const jsonInput = input.map(message => JSON.stringify(message))
  const { connectionStatus, messages } = websocketConnect(url, jsonInput)
  const jsonMessages = messages.map(message => JSON.parse(message))
  return { connectionStatus, messages: jsonMessages }
}
```

## Angular 4 example

The following is a very simple example Angular 4 service that uses `rxjs-websockets` to expose the messages from the server as an observable and take input messages using a procedural API. In most cases it would be preferable to wire the input stream up directly from one or more source observables.

```javascript
// file: server-socket.service.ts
import { Injectable } from '@angular/core'
import { QueueingSubject } from 'queueing-subject'
import { Observable } from 'rxjs/Observable'
import websocketConnect from 'rxjs-websockets'

@Injectable()
export class ServerSocket {
  private inputStream: QueueingSubject<string>
  public messages: Observable<string>

  public connect() {
    if (this.messages)
      return

    // Using share() causes a single websocket to be created when the first
    // observer subscribes. This socket is shared with subsequent observers
    // and closed when the observer count falls to zero.
    this.messages = websocketConnect(
      'ws://127.0.0.1:4201/ws',
      this.inputStream = new QueueingSubject<string>()
    ).messages.share()
  }

  public send(message: string):void {
    // If the websocket is not connected then the QueueingSubject will ensure
    // that messages are queued and delivered when the websocket reconnects.
    // A regular Subject can be used to discard messages sent when the websocket
    // is disconnected.
    this.inputStream.next(message)
  }
}
```

This service could be used like this:

```javascript
import { Component } from '@angular/core'
import { Subscription } from 'rxjs/Subscription'
import { ServerSocket } from './server-socket.service'

@Component({
  selector: 'socket-user',
  templateUrl: './socket-user.component.html',
  styleUrls: ['./socket-user.component.scss']
})
export class SocketUserComponent {
  private socketSubscription: Subscription

  constructor(private socket: ServerSocket) {}

  ngOnInit() {
    this.socket.connect()

    this.socketSubscription = this.socket.messages.subscribe((message: string) => {
      console.log('received message from server: ', message)
    })

    // send message to server, if the socket is not connected it will be sent
    // as soon as the connection becomes available thanks to QueueingSubject
    this.socket.send('hello')
  }

  ngOnDestroy() {
    this.socketSubscription.unsubscribe()
  }
}
```

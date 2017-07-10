# rxjs-websockets

An rxjs websocket library with a simple implementation built with flexibility in mind. Great for use with angular 2 or any other rxjs project. Supports the browser and node.js.

## Comparisons to other rxjs websocket libraries:

 * [observable-socket](https://github.com/killtheliterate/observable-socket) provides the input stream for the user, in rxjs-websockets the input stream is taken as a parameter allowing the user to choose the appropriate subject or observable for their needs. [queueing-subject](https://github.com/ohjames/queueing-subject) can be used to achieve the same semantics as observable-socket. rxjs-websockets exposes the websocket connection status as an observable, with observable-socket the WebSocket object must be used directly to listen for connection status changes.
 * [rxjs built-in websocket subject](https://github.com/ReactiveX/rxjs/blob/next/src/observable/dom/webSocket.ts): Implemented as a Subject so lacks the flexibility that rxjs-websockets and observable-socket provide. It does not provide any ability to monitor the web socket connection state.

## How to install (with webpack/angular-cli)

Install the dependency:

```bash
npm install -S rxjs-websockets
# the following dependency is recommended for most users
npm install -S queueing-subject
```

## How to use

```javascript
import { QueueingSubject } from 'queueing-subject'
import websocketConnect from 'rxjs-websockets'

// this subject queues as necessary to ensure every message is delivered
const input = new QueueingSubject()

// this method returns an object which contains two observables
const { messages, connectionStatus } = websocketConnect('ws://localhost/websocket-path', input)

// this value will be stringified before being sent to the server
input.next({ whateverField: 'some data' })

// the connectionStatus stream will provides the current number of websocket
// connections immediately to each new observer and updates as it changes
const connectionStatusSubscription = connectionStatus.subscribe(numberConnected => {
  console.log('number of connected websockets:', numberConnected)
})

// the websocket connection is created lazily when the messages observable is
// subscribed to
const messagesSubscription = messages.subscribe(message => {
  // message is the message from the server parsed with JSON.parse(...)
  console.log('received message:', JSON.stringify(message))
})

// this will close the websocket
messagesSubscription.unsubscribe()

// closing the websocket does not close the connection status observable, it
// can be used to monitor future connection status changes
connectionStatusSubscription.unsubscribe()
```

`messages` is a cold observable, means the websocket connection is attempted lazily when a subscription is made to the `messages` observable. Advanced users of this library will find it important to understand the distinction between [hot and cold observables](https://blog.thoughtram.io/angular/2016/06/16/cold-vs-hot-observables.html), for most it will be sufficient to use the [share operator](http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html#instance-method-share) as shown below.

## How to use with angular 2

You can write your own service to provide a websocket using this library as follows:

```javascript
// file: server-socket.service.ts
import { Injectable } from '@angular/core'
import { QueueingSubject } from 'queueing-subject'
import { Observable } from 'rxjs/Observable'
import websocketConnect from 'rxjs-websockets'

@Injectable()
export class ServerSocket {
  private inputStream: QueueingSubject<any>
  public messages: Observable<any>

  public connect() {
    if (this.messages)
      return

    // Using share() causes a single websocket to be created when the first
    // observer subscribes. This socket is shared with subsequent observers
    // and closed when the observer count falls to zero.
    this.messages = websocketConnect(
      'ws://127.0.0.1:4201/ws',
      this.inputStream = new QueueingSubject<any>()
    ).messages.share()
  }

  public send(message: any):void {
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

    this.socketSubscription = this.socket.messages.subscribe((message:any) => {
      console.log('received message from server: ', message)
    })

    // send message to server, if the socket is not connected it will be sent
    // as soon as the connection becomes available thanks to QueueingSubject
    this.socket.send({ type: 'helloServer' })
  }

  ngOnDestroy() {
    this.socketSubscription.unsubscribe()
  }
}
```

## Reconnecting on failure

This can be done with built-in rxjs operators:

```javascript
const input = new QueueingSubject<any>()
const { messages, connectionStatus } = websocketConnect(`ws://server`, input)

// try to reconnect every second
messages.retryWhen(errors => errors.delay(1000)).subscribe(message => {
  console.log(message)
})
```

## How to use with alternate WebSocket implementations

You can supply a websocket factory function (that takes a URL and returns an object that is compatible with WebSocket) as such:

```javascript
const { messages } = websocketConnect(
  'ws://127.0.0.1:4201/ws',
  this.inputStream = new QueueingSubject<any>(),
  url => new WebSocket(url)
)
```

## How to disable JSON parsing

If you prefer to handle raw messages, you can disable the default `JSON.stringify` on received messages and `JSON.parse` on sent messages with a falsy fourth parameter as such:

```javascript
const { messages } = websocketConnect(
  'ws://127.0.0.1:4201/ws',
  this.inputStream = new QueueingSubject<any>(),
  url => new WebSocket(url),
  false
)
```

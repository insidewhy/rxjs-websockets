# rxjs-websockets

An rxjs websocket library with a simple implementation built with flexibility in mind. Great for use with angular 2 or any other rxjs project.

## Comparisons to other rxjs websocket libraries:

 * [observable socket](https://github.com/killtheliterate/observable-socket) provides the input stream for the user, in rxjs-websockets the input stream is taken as a parameter allowing the user to choose the appropriate subject or observable for their needs. [queueing-subject](https://github.com/ohjames/queueing-subject) can be used to achieve the same semantics as observable-socket.
 * [rxjs builting websocket subject](https://github.com/ReactiveX/rxjs/blob/next/src/observable/dom/webSocket.ts): Implemented as a Subject so lacks the flexibility that rxjs-websockets and observable-socket provide.

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
const output = websocketConnect('ws://localhost/websocket-path', input)

// this value will be stringified before being sent to the server
input.next({ whateverField: 'some data' })
output.subscribe(value => {
  // value is the message from the server parsed with JSON.parse(...)
  console.log('received message', JSON.stringify(value))
})
```

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
  public outputStream: Observable<any>

  public connect() {
    if (this.outputStream)
      return this.outputStream

    // Using share() causes a single websocket to be created when the first
    // observer subscribes. This socket is shared with subsequent observers
    // and closed when the observer count falls to zero.
    return this.outputStream = websocketConnect(
      'ws://127.0.0.1:4201/ws',
      this.inputStream = new QueueingSubject<any>()
    ).share()
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

  constructor(private socket: ServerSocket) {
    const stream = this.socket.connect()

    this.socketSubscription = stream.subscribe(message:any => {
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

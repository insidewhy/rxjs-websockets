# angular2-websocket-service

An rxjs stream based websocket factory service for angular 2.

## How to install this dependency (with webpack/angular-cli)

Install the dependency:

```bash
npm install -S angular2-websocket-service
# the following dependency is recommended for most users
npm install -S queueing-subject
```

Import the service in your `app.module.ts` or equivalent:

```javascript
import { WebSocketService } from 'angular2-websocket-service'
```

Add the service to your module's providers list:

```javascript
@NgModule({
  imports: [ /* ... */ ],
  declarations: [ /* ... */ ],
  providers: [ WebSocketService ],
  bootstrap: [ /* ... */ ],
})
export class AppModule {}
```

## How to use the service

You can write your own service to provide a websocket using this factory as follows:

```javascript
// file: server-socket.service.ts
import { Injectable } from '@angular/core'
import { QueueingSubject } from 'queueing-subject'
import { Observable } from 'rxjs/Observable'
import { WebSocketService } from 'angular2-websocket-service'

@Injectable()
export class ServerSocket {
  private inputStream: QueueingSubject<any>
  public outputStream: Observable<any>

  constructor(private socketFactory: WebSocketService) {}

  public connect() {
    if (this.outputStream)
      return this.outputStream

    this.outputStream = this.socketFactory.connect(
      'ws://127.0.0.1:4201/ws',
      this.inputStream = new QueueingSubject<any>()
    )

    return this.outputStream
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
import { ServerSocket } from './server-socket.service'

@Component({
  selector: 'socket-user',
  templateUrl: './socket-user.component.html',
  styleUrls: ['./socket-user.component.scss']
})
export class SocketUserComponent {
  constructor(private socket: ServerSocket) {
    const stream = this.socket.connect()

    stream.subscribe(message:any => {
      console.log('received message from server: ', message)
    })

    // send message to server, if the socket is not connected it will be sent
    // as soon as the connection becomes available thanks to QueueingSubject
    this.socket.send({ type: 'helloServer' })
  }
}
```

import { Injectable } from '@angular/core'
import { Observable } from 'rxjs/Observable'

@Injectable()
export class WebSocketService {
  connect(url: string, input: Observable<any>): Observable<any> {
    const socket = new WebSocket(url)

    input.subscribe(data => { socket.send(JSON.stringify(data)) })

    return Observable.create(observer => {
      socket.onmessage = message => { observer.next(JSON.parse(message.data)) }
      socket.onerror = socket.onerror.bind(socket)
    })
  }
}

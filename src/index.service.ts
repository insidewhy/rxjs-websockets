import { Injectable } from '@angular/core'
import { Observable } from 'rxjs/Observable'

@Injectable()
export class WebSocketService {
  connect(url: string, input: Observable<any>): Promise< Observable<any> > {
    const socket = new WebSocket(url)

    input.subscribe(data => { socket.send(JSON.stringify(data)) })

    return new Promise((resolve, reject) => {
      socket.onerror = reject

      socket.onopen = () => {
        resolve(
          Observable.create(observer => {
            socket.onmessage = message => { observer.next(JSON.parse(message.data)) }
            socket.onerror = observer.error.bind(observer)
          })
        )
      }
    })
  }
}

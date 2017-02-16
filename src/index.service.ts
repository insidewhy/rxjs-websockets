import { Observable } from 'rxjs/Observable'
import { Subscription } from 'rxjs/Subscription'

export class WebSocketService {
  connect(url: string, input: Observable<any>): Observable<any> {
    return new Observable<any>(observer => {
      const socket = new WebSocket(url)
      let inputSubscription: Subscription

      socket.onopen = () => {
        inputSubscription = input.subscribe(data => {
          socket.send(JSON.stringify(data))
        })
      }

      socket.onmessage = message => {
        observer.next(JSON.parse(message.data))
      }

      socket.onerror = error => {
        observer.error(error)
      }

      socket.onclose = () => {
        observer.complete()
      }

      return () => {
        if (inputSubscription)
          inputSubscription.unsubscribe()

        if (socket)
          socket.close()
      }
    })
  }
}

import { Injectable } from '@angular/core'
import { Observable } from 'rxjs/Observable'
import { Subscription } from 'rxjs/Subscription'

import 'rxjs/add/operator/share'

@Injectable()
export class WebSocketService {
  connect(url: string, input: Observable<any>): Observable<any> {
    return new Observable<any>(observer => {
      let inputSubscription: Subscription
      const socket = new WebSocket(url)

      const shutdown = () => {
        if (inputSubscription) {
          inputSubscription.unsubscribe()
          inputSubscription = null
        }
      }

      socket.onopen = () => {
        inputSubscription = input.subscribe(data => {
          socket.send(JSON.stringify(data))
        })
      }

      socket.onmessage = message => {
        observer.next(JSON.parse(message.data))
      }

      socket.onerror = error => {
        shutdown()
        observer.error(error)
      }

      socket.onclose = () => {
        shutdown()
        observer.complete()
      }
    }).share()
  }
}

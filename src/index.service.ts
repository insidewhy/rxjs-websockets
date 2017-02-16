import { Injectable } from '@angular/core'
import { Observable } from 'rxjs/Observable'
import { Subscription } from 'rxjs/Subscription'

import 'rxjs/add/operator/share'
import 'rxjs/add/operator/finally'

@Injectable()
export class WebSocketService {
  connect(url: string, input: Observable<any>): Observable<any> {
    let socket: WebSocket
    let inputSubscription: Subscription

    return new Observable<any>(observer => {
      socket = new WebSocket(url)

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
    })
    .finally(() => {
      if (inputSubscription) {
        inputSubscription.unsubscribe()
        inputSubscription = null
      }

      if (socket) {
        socket.close()
        socket = null
      }
    })
  }
}

import { Injectable } from '@angular/core'
import { Observable } from 'rxjs/Observable'
import { Subscription } from 'rxjs/Subscription'
import { QueueingSubject } from 'queueing-subject'

import 'rxjs/add/operator/share'

@Injectable()
export class WebSocketService {
  connect(url: string, input: Observable<any>): Observable<any> {
    // wrap in a stream that will queue values until the socket is open
    const inputQueue = new QueueingSubject<any>()
    let inputSubscription = input.subscribe(data => { inputQueue.next(data) })

    return new Observable<any>(observer => {
      let inputQueueSubscription: Subscription
      const socket = new WebSocket(url)

      socket.onerror = error => {
        inputSubscription.unsubscribe()
        inputSubscription = null
        observer.error(error)
      }

      socket.onmessage = message => {
        observer.next(JSON.parse(message.data))
      }

      socket.onopen = () => {
        inputQueueSubscription = inputQueue.subscribe(data => {
          socket.send(JSON.stringify(data))
        })
      }

      socket.onclose = () => {
        if (inputQueueSubscription) {
          inputQueueSubscription.unsubscribe()
          inputQueueSubscription = null
        }
        inputSubscription.unsubscribe()
        inputSubscription = null
        observer.complete()
      }
    }).share()
  }
}

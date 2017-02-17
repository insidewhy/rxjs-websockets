import { Observable } from 'rxjs/Observable'
import { Subscription } from 'rxjs/Subscription'
import { BehaviorSubject } from 'rxjs/BehaviorSubject'

export interface Connection {
  connectionStatus: Observable<any>,
  messages: Observable<any>,
}

export default function connect(url: string, input: Observable<any>): Connection {
  const connectionStatus = new BehaviorSubject(false)

  const messages = new Observable<any>(observer => {
    const socket = new WebSocket(url)
    let inputSubscription: Subscription

    socket.onopen = () => {
      connectionStatus.next(true)
      inputSubscription = input.subscribe(data => {
        socket.send(JSON.stringify(data))
      })
    }

    socket.onmessage = message => {
      observer.next(JSON.parse(message.data))
    }

    socket.onerror = error => {
      connectionStatus.next(false)
      observer.error(error)
    }

    socket.onclose = () => {
      connectionStatus.next(false)
      observer.complete()
    }

    return () => {
      if (inputSubscription)
        inputSubscription.unsubscribe()

      if (socket) {
        connectionStatus.next(false)
        socket.close()
      }
    }
  })

  return { messages, connectionStatus }
}

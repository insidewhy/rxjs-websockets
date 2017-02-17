import { Observable } from 'rxjs/Observable'
import { Subscription } from 'rxjs/Subscription'
import { BehaviorSubject } from 'rxjs/BehaviorSubject'

export interface Connection {
  connectionStatus: Observable<any>,
  messages: Observable<any>,
}

export default function connect(url: string, input: Observable<any>): Connection {
  const connectionStatus = new BehaviorSubject<number>(0)

  const messages = new Observable<any>(observer => {
    const socket = new WebSocket(url)
    let inputSubscription: Subscription

    let open = false
    const closed = () => {
      if (! open)
        return

      connectionStatus.next(connectionStatus.getValue() - 1)
      open = false
    }

    socket.onopen = () => {
      open = true
      connectionStatus.next(connectionStatus.getValue() + 1)
      inputSubscription = input.subscribe(data => {
        socket.send(JSON.stringify(data))
      })
    }

    socket.onmessage = message => {
      observer.next(JSON.parse(message.data))
    }

    socket.onerror = error => {
      closed()
      observer.error(error)
    }

    socket.onclose = () => {
      closed()
      observer.complete()
    }

    return () => {
      if (inputSubscription)
        inputSubscription.unsubscribe()

      if (socket) {
        closed()
        socket.close()
      }
    }
  })

  return { messages, connectionStatus }
}

import { Observable } from 'rxjs/Observable'
import { Subscription } from 'rxjs/Subscription'
import { BehaviorSubject } from 'rxjs/BehaviorSubject'

export interface Connection {
  connectionStatus: Observable<any>,
  messages: Observable<any>,
}

export interface IWebSocket {
  close()
  send(string)
  onopen: Function
  onclose: Function
  onmessage: Function
  onerror: Function
}

export type WebSocketFactory = (url: String) => IWebSocket

const defaultWebsocketFactory = (url: string): IWebSocket => new WebSocket(url)

export default function connect(
  url: string,
  input: Observable<any>,
  websocketFactory: WebSocketFactory = defaultWebsocketFactory,
  jsonParse: boolean = true
): Connection {
  const connectionStatus = new BehaviorSubject<number>(0)

  const messages = new Observable<any>(observer => {
    const socket = websocketFactory(url)
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
        const sendData = jsonParse ? JSON.stringify(data) : data
        socket.send(sendData)
      })
    }

    socket.onmessage = message => {
      const nextData = jsonParse ? JSON.parse(message.data) : message.data
      observer.next(nextData)
    }

    socket.onerror = error => {
      closed()
      observer.error(error)
    }

    socket.onclose = (event: CloseEvent) => {
      closed()
      if (event.wasClean)
        observer.complete()
      else
        observer.error(new Error(event.reason))
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

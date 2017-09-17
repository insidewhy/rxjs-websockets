import { Observable } from 'rxjs/Observable'
import { Subscription } from 'rxjs/Subscription'
import { BehaviorSubject } from 'rxjs/BehaviorSubject'

export interface Connection {
  connectionStatus: Observable<number>,
  messages: Observable<string>,
}

export interface IWebSocket {
  close()
  send(data: string | ArrayBuffer | Blob)
  onopen?: (OpenEvent) => any
  onclose?: (CloseEvent) => any
  onmessage?: (MessageEvent) => any
  onerror?: (ErrorEvent) => any
}

export type WebSocketFactory = (url: string, protocols?: string | string[]) => IWebSocket

const defaultWebsocketFactory = (url: string, protocol?: string): IWebSocket => new WebSocket(url, protocol)

export default function connect(
  url: string,
  input: Observable<string>,
  protocols?: string | string[],
  websocketFactory: WebSocketFactory = defaultWebsocketFactory,
): Connection {
  const connectionStatus = new BehaviorSubject<number>(0)

  const messages = new Observable<string>(observer => {
    const socket = websocketFactory(url, protocols)
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
        socket.send(data)
      })
    }

    socket.onmessage = (message: MessageEvent) => {
      observer.next(message.data)
    }

    socket.onerror = (error: ErrorEvent) => {
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

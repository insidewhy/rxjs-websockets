import { Observable, Subscription, BehaviorSubject } from 'rxjs'
import * as WebSocket from 'ws';

export interface Connection {
  connectionStatus: Observable<number>,
  messages: Observable<WebSocket.Data>,
}

export interface IWebSocket {
  close(): void
  send(data: WebSocket.Data)
  onopen?: (event: { target: WebSocket }) => void;
  onerror?: (event: {error: any, message: string, type: string, target: WebSocket }) => void;
  onclose?: (event: { wasClean: boolean; code: number; reason: string; target: WebSocket }) => void;
  onmessage?: (event: { data: WebSocket.Data; type: string; target: WebSocket }) => void;
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

  const messages = new Observable<WebSocket.Data>(observer => {
    const socket = websocketFactory(url, protocols)
    let inputSubscription: Subscription

    let open = false
    let forcedClose = false

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

    socket.onmessage = (event) => {
      observer.next(event.data)
    }

    socket.onerror = (error) => {
      closed()
      observer.error(error)
    }

    socket.onclose = (event) => {
      // prevent observer.complete() being called after observer.error(...)
      if (! open)
        return

      closed()
      if (forcedClose)
        observer.complete()
      else
        observer.error(new Error(event.reason))
    }

    return () => {
      forcedClose = true
      if (inputSubscription)
        inputSubscription.unsubscribe()

      if (open) {
        closed()
        socket.close()
      }
    }
  })

  return { messages, connectionStatus }
}

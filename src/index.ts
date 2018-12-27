import { Observable, Subscription, BehaviorSubject } from 'rxjs'

export interface Connection<T> {
  connectionStatus: Observable<number>,
  messages: Observable<T>,
}

export interface IWebSocket {
  close()
  send(data: string | ArrayBuffer | Blob)
  onopen?: (event: Event) => any
  onclose?: (event: CloseEvent) => any
  onmessage?: (event: MessageEvent) => any
  onerror?: (event: ErrorEvent) => any
}

export type WebSocketFactory = (url: string, protocols?: string | string[]) => IWebSocket

const defaultProtocols = [];

const defaultWebsocketFactory: WebSocketFactory = (url: string, protocols: string | string[] = defaultProtocols): IWebSocket => new WebSocket(url, protocols)

export default function connect<T extends string | ArrayBuffer | Blob = string | ArrayBuffer | Blob>(
  url: string,
  input: Observable<T>,
  protocols: string | string[] = defaultProtocols,
  websocketFactory: WebSocketFactory = defaultWebsocketFactory,
): Connection<T> {
  const connectionStatus = new BehaviorSubject<number>(0)

  const messages = new Observable<T>(observer => {
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

    socket.onmessage = (message: MessageEvent) => {
      observer.next(message.data)
    }

    socket.onerror = (error: ErrorEvent) => {
      closed()
      observer.error(error)
    }

    socket.onclose = (event: CloseEvent) => {
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

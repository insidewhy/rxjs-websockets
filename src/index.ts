import { Observable, Subscription, BehaviorSubject } from 'rxjs'

export interface Connection {
  connectionStatus: Observable<number>,
  messages: Observable<string>,
}

export interface IWebSocket {
  close()
  send(data: string | ArrayBuffer | Blob)
  onopen?: (OpenEvent: any) => any
  onclose?: (CloseEvent: any) => any
  onmessage?: (MessageEvent: any) => any
  onerror?: (ErrorEvent: any) => any
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

    let socket;
    try {
      socket = websocketFactory(url, protocols);
    } catch(err) {
      console.log(err);
    }
    let inputSubscription: Subscription

    let open = false
    let forcedClose = false

    const closed = () => {
      if (! open)
        return

      connectionStatus.next(connectionStatus.getValue() - 1)
      open = false
    }

    if (socket){
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
        if (forcedClose)
          observer.complete()
        else
          observer.error(new Error(event.reason))
      }
    }


    return () => {
      forcedClose = true
      if (inputSubscription)
        inputSubscription.unsubscribe()

      if (open) {
        closed()
        if (socket){
          socket.close()
        }
      }
    }
  })

  return { messages, connectionStatus }
}

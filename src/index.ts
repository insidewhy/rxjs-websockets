import { Observable, Subscription, Subject } from 'rxjs'

interface EventWithCodeAndReason {
  code: number
  reason: string
}

interface EventWithMessage {
  message?: string
}

type WebSocketPayload = string | ArrayBuffer | Blob

export interface IWebSocket {
  close(): any
  send(data: WebSocketPayload): any

  // TypeScript doesn't seem to apply function bivariance on each property when
  // comparing an object to an interface so the argument types have to be `any` :(
  // Ideally would be able to use the EventWith... interfaces
  onopen: ((event: any) => any) | null
  onclose: ((event: any) => any) | null
  onmessage: ((event: any) => any) | null
  onerror: ((event: any) => any) | null
}

export type WebSocketFactory = (url: string, protocols: string | string[]) => IWebSocket

export type GetWebSocketResponses<T = WebSocketPayload> = (
  input: Observable<WebSocketPayload>
) => Observable<T>

const defaultProtocols = []

const defaultWebsocketFactory: WebSocketFactory = (
  url: string,
  protocols: string | string[],
): IWebSocket => new WebSocket(url, protocols)

export interface WebSocketOptions {
  protocols: string | string[]
  makeWebSocket: WebSocketFactory
}

export const normalClosureMessage = 'Normal closure'

export default function makeWebSocketObservable<T extends WebSocketPayload = WebSocketPayload>(
  url: string,
  {
    protocols = defaultProtocols,
    makeWebSocket = defaultWebsocketFactory
  }: WebSocketOptions = {
    protocols: defaultProtocols,
    makeWebSocket: defaultWebsocketFactory
  },
): Observable<GetWebSocketResponses<T>> {

  return new Observable<GetWebSocketResponses<T>>(observer => {
    let inputSubscription: Subscription
    const messages = new Subject<T>()

    const getWebSocketResponses: GetWebSocketResponses<T> = (input: Observable<WebSocketPayload>) => {
      if (inputSubscription) {
        setClosedStatus()
        observer.error(new Error('Web socket message factory function called more than once'))
      } else {
        inputSubscription = input.subscribe(data => { socket.send(data) })
        return messages
      }
    }

    const socket = makeWebSocket(url, protocols)

    let isSocketOpen = false
    let forcedClose = false

    const setClosedStatus = () => { isSocketOpen = false }

    socket.onopen = () => {
      isSocketOpen = true
      observer.next(getWebSocketResponses)
    }

    socket.onmessage = (message: { data: T }) => {
      messages.next(message.data)
    }

    socket.onerror = (error: EventWithMessage) => {
      setClosedStatus()
      observer.error(new Error(error.message))
    }

    socket.onclose = (event: EventWithCodeAndReason) => {
      // prevent observer.complete() being called after observer.error(...)
      if (! isSocketOpen)
        return

      setClosedStatus()
      if (forcedClose) {
        observer.complete()
        messages.complete()
      }
      else {
        observer.error(new Error(event.code === 1000 ? normalClosureMessage : event.reason))
      }
    }

    return () => {
      forcedClose = true
      if (inputSubscription)
        inputSubscription.unsubscribe()

      if (isSocketOpen) {
        setClosedStatus()
        socket.close()
      }
    }
  })
}

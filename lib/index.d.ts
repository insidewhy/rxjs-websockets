import { Observable } from 'rxjs';
export interface Connection {
    connectionStatus: Observable<number>;
    messages: Observable<string>;
}
export interface IWebSocket {
    close(): any;
    send(data: string | ArrayBuffer | Blob): any;
    onopen?: (OpenEvent: any) => any;
    onclose?: (CloseEvent: any) => any;
    onmessage?: (MessageEvent: any) => any;
    onerror?: (ErrorEvent: any) => any;
}
export declare type WebSocketFactory = (url: string, protocols?: string | string[]) => IWebSocket;
export default function connect(url: string, input: Observable<string>, protocols?: string | string[], websocketFactory?: WebSocketFactory): Connection;

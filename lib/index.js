"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var rxjs_1 = require("rxjs");
var defaultWebsocketFactory = function (url, protocol) { return new WebSocket(url, protocol); };
function connect(url, input, protocols, websocketFactory) {
    if (websocketFactory === void 0) { websocketFactory = defaultWebsocketFactory; }
    var connectionStatus = new rxjs_1.BehaviorSubject(0);
    var messages = new rxjs_1.Observable(function (observer) {
        var socket;
        try {
            socket = websocketFactory(url, protocols);
        }
        catch (err) {
            console.log(err);
        }
        var inputSubscription;
        var open = false;
        var forcedClose = false;
        var closed = function () {
            if (!open)
                return;
            connectionStatus.next(connectionStatus.getValue() - 1);
            open = false;
        };
        if (socket) {
            socket.onopen = function () {
                open = true;
                connectionStatus.next(connectionStatus.getValue() + 1);
                inputSubscription = input.subscribe(function (data) {
                    socket.send(data);
                });
            };
            socket.onmessage = function (message) {
                observer.next(message.data);
            };
            socket.onerror = function (error) {
                closed();
                observer.error(error);
            };
            socket.onclose = function (event) {
                closed();
                if (forcedClose)
                    observer.complete();
                else
                    observer.error(new Error(event.reason));
            };
        }
        return function () {
            forcedClose = true;
            if (inputSubscription)
                inputSubscription.unsubscribe();
            if (open) {
                closed();
                if (socket) {
                    socket.close();
                }
            }
        };
    });
    return { messages: messages, connectionStatus: connectionStatus };
}
exports.default = connect;
//# sourceMappingURL=index.js.map
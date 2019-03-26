
# Changelog

- 2019/03/26 - 7.0.0
  - Ensure websocket is closed when associated observable is unsubscribed during connection.
- 2019/01/14 - 7.0.0-beta.2
  - Allow configuration arguments to be left out when defaults are desired.
- 2019/01/09 - 7.0.0-beta.1
  - Connection status handling is much simpler, everything can be done with a single observable.
  - Configuration parameters taken as an object instead of arguments, more future proof and self-documenting.
  - Improved documentation.
  - Provide reliable way to detect normal WebSocket closures.
- 2019/01/07 - 7.0.0-alpha.1 - Support binary requests/responses.
- 2019/01/06 - 6.0.4 - Make WebsocketFactory interface more permissive.
- 2018/11/15 - 6.0.3 - Fix firefox bug when not specifying protocol.
- 2018/07/11 - 6.0.1 - Ensure `observer.complete()` is not called after `observer.error()`.
- 2018/05/08 - 5.0.0 - Port from rxjs 5 to rxjs 6.
- 2017/10/13 - 4.0.0 - Make `rxjs` a peer dependency.
- 2017/09/17 - 3.0.1 - Improve typing and make `protocols` an optional argument.
- 2017/09/17 - 3.0.0 - Support `protocols` argument and improve typing.
- 2017/09/03 - 2.0.0 - Remove support for json encoding/decoding.
test

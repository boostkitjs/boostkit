# @rudderjs/middleware

Middleware classes — CORS, logger, throttle, CSRF, and the `Pipeline` executor.

Key exports: `Middleware` base class, `CorsMiddleware`, `LoggerMiddleware`, `ThrottleMiddleware`, `CsrfMiddleware`, `RateLimit` fluent API, `Pipeline`, `getCsrfToken()`.

`RateLimit` requires a cache provider registered before middleware runs. `ThrottleMiddleware` is cache-backed — no cache = no throttling.

`clientIp(req)` reads `req.ip` (set by server-hono's `extractIp()`). Custom `.by()` functions should also use `req.ip`, not raw headers like `x-real-ip`.

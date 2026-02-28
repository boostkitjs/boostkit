import forge from '../bootstrap/app.ts'

export default {
  fetch: (request: Request, env?: unknown, ctx?: unknown) => forge.handleRequest(request, env, ctx),
}

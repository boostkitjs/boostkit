import { Controller, Get, Post, Middleware } from '@boostkit/router'
import { RateLimit } from '@boostkit/middleware'
import type { AppRequest, AppResponse } from '@boostkit/contracts'

const limit = RateLimit.perMinute(30).toHandler()

@Controller('/api/test')
export class TestController {
  @Get('/ping')
  ping(_req: AppRequest, res: AppResponse) {
    return res.json({ message: 'pong', source: 'decorator routing' })
  }

  @Post('/echo')
  @Middleware([limit])
  echo(req: AppRequest, res: AppResponse) {
    return res.json({ received: req.body })
  }
}

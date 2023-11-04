import { Controller, Get, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { RateLimiterGuard } from "./rate-limiter/rate-limiter.guard";
import { RateLimiter, RateLimiterKey } from "./rate-limiter/rate-limiter.decorator";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @RateLimiter({points: 60, duration: 10, consume: 1})
  @UseGuards(RateLimiterGuard)
  async getHello(): Promise<string> {
      return this.appService.getHello();
  }
}

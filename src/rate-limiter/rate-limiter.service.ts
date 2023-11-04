import { Injectable } from '@nestjs/common';
import { RateLimiterMemory } from "rate-limiter-flexible";

@Injectable()
export class RateLimiterService {
    private readonly opts = {
        points: 3, // 3 points
        duration: 5, // Per 5 seconds
    };
    private readonly rateLimiter = new RateLimiterMemory(this.opts);

    public consume(a,b) {
        return this.rateLimiter.consume(a,b);
    }
}

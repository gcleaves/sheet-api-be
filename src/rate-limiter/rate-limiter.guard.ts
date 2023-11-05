import {CanActivate, ExecutionContext, Injectable} from '@nestjs/common';
import {Observable} from 'rxjs';
import {Reflector} from '@nestjs/core';
import {RateLimiterMemory} from "rate-limiter-flexible";
import { RateLimiter, RateLimiterKey } from './rate-limiter.decorator';

@Injectable()
export class RateLimiterGuard implements CanActivate {
    private readonly limiters: Record<string, RateLimiterMemory> = {};

    private readonly opts = {
        key: 'global',
        points: 3, // 3 points
        duration: 5, // Per 5 seconds
        consume: 1
    };

    constructor(private reflector: Reflector) {}

    canActivate(
        context: ExecutionContext,
    ): boolean | Promise<boolean> | Observable<boolean> {

        const rateLimiterParams = this.reflector.get(RateLimiter, context.getHandler()) ||
            this.reflector.get(RateLimiter, context.getClass());
        console.log('rateLimiterParams',rateLimiterParams)
        const rateLimiterKey = this.reflector.get(RateLimiterKey, context.getHandler()) ||
            this.reflector.get(RateLimiterKey, context.getClass()) || 'global';
        const opts = rateLimiterParams || this.opts;

        if(!this.limiters[JSON.stringify(opts)]) {
            this.limiters[JSON.stringify(opts)] = new RateLimiterMemory(opts);
        }
        const rateLimiter = this.limiters[JSON.stringify(opts)];

        //console.log()
        return rateLimiter.consume(rateLimiterKey, opts.consume || 1)
            .then(r => {
                console.log(rateLimiterKey, r);
                return true;
            })
            .catch(r => {
                console.log(rateLimiterKey, r);
                throw {message: 'Too many requests', statusCode: 429};
                return false;
            });
    }
}

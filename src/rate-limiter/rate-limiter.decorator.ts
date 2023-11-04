import { SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export interface RateLimiterDecoratorParams {
    points: number,
    duration: number,
    consume?: number,
}

export const RateLimiter = Reflector.createDecorator<RateLimiterDecoratorParams>();
export const RateLimiterKey = Reflector.createDecorator<string>();

//export const RateLimiterKey = (key: string) => SetMetadata('rateLimiterKey', key);

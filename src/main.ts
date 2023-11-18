import {NestFactory} from '@nestjs/core';
import {AppModule} from './app.module';
import * as session from 'express-session';
import {ConfigService} from "@nestjs/config";
import RedisStore from "connect-redis"
import Redis from 'ioredis';
const redis = new Redis();
const redisStore = new RedisStore({
    client: redis,
    prefix: "sheets-session:",
})

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    //console.log('SESSION_SECRET', app.get(ConfigService).get('SESSION_SECRET'));
    app.use(
        session({
            store: redisStore,
            secret: app.get(ConfigService).get('SESSION_SECRET'),
            resave: false,
            saveUninitialized: false,
        }),
    );

    await app.listen(3000);
}


bootstrap();

import {NestFactory} from '@nestjs/core';
import {AppModule} from './app.module';
import * as session from 'express-session';
import {ConfigService} from "@nestjs/config";

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    //console.log('SESSION_SECRET', app.get(ConfigService).get('SESSION_SECRET'));
    app.use(
        session({
            secret: app.get(ConfigService).get('SESSION_SECRET'),
            resave: false,
            saveUninitialized: false,
        }),
    );

    await app.listen(3000);
}


bootstrap();

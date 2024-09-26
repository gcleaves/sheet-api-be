import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as session from 'express-session';
import { ConfigService } from "@nestjs/config";
import RedisStore from "connect-redis"
import Redis from 'ioredis';
import { Worker, Job } from 'bullmq';
import { ApiService } from './api.service';

const redis = new Redis({
    host: process.env.REDIS_HOST as any || 'localhost',
    port: process.env.REDIS_PORT as any || 6379,
    db: process.env.REDIS_DB as any || 0,
});
const redisStore = new RedisStore({
    client: redis,
    prefix: "sheets-session:",

})

async function bootstrap() {
    const app = await NestFactory.create(AppModule, { cors: true });
    const apiService = app.get(ApiService);

    //console.log('SESSION_SECRET', app.get(ConfigService).get('SESSION_SECRET'));
    app.use(
        session({
            store: redisStore,
            secret: app.get(ConfigService).get('SESSION_SECRET'),
            resave: false,
            saveUninitialized: false,
        }),
    );


    const worker = new Worker('insert', async (job: Job) => {
        // Optionally sending an object as progress
        // Do something with job
        console.log('job', job.data);

        const sheet = await apiService.getSheet(job.data.uid, job.data.sheetName);
        const added = await sheet.addRows(job.data.insert);
        
        return added.map(a=>a.toObject());
    }, { 
        connection: {
            host: process.env.REDIS_HOST as any || 'localhost',
            port: process.env.REDIS_PORT as any || 6379,
            db: process.env.REDIS_DB as any || 1
        }
    });

    await app.listen(3000);
}


bootstrap();

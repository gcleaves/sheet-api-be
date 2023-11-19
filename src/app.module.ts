import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {DataSource, Repository} from 'typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ApiController } from './api.controller';
import { LoginController } from './login/login.controller';
import { ApiService } from './api.service';
import service_account from './config/service_account';
import { UsersModule } from "./users/users.module";
import { RateLimiterService } from './rate-limiter/rate-limiter.service';
import { SheetsController } from './sheets/sheets.controller';
import { SheetsService } from './sheets/sheets.service';
import { SheetsModule } from './sheets/sheets.module';
import {User} from "./users/user.entity";
import {Sheet} from "./sheets/sheet.entity";
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    UsersModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [service_account],
    }),
    TypeOrmModule.forRoot({
      type: process.env.DB_TYPE as any || 'mysql',
      host: process.env.DB_HOST as any || 'localhost',
      port: process.env.DB_PORT as any || 3306,
      username: process.env.DB_USER as any || 'sheetapi',
      password: process.env.DB_PASSWORD as any || 'sheetapi',
      database: process.env.DB_NAME as any || 'sheetapi',
      entities: [User,Sheet],
      synchronize: ((process.env.DB_SYNC as any || 'false').toLowerCase()) === 'true',
      autoLoadEntities: true,
    }),
    SheetsModule,
    CacheModule.register({
      isGlobal: true,
      store: redisStore,
      host: process.env.REDIS_HOST as any || 'localhost',
      port: process.env.REDIS_PORT as any || 6379,
      db: process.env.REDIS_DB as any || 1
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
  ],
  controllers: [AppController, ApiController, LoginController, SheetsController],
  providers: [AppService, ApiService, RateLimiterService, SheetsService],
})
export class AppModule {
  constructor(private dataSource: DataSource) {};
}

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
import { ServiceAccountsController } from './service-accounts/service-accounts.controller';
import { ServiceAccountsModule } from './service-accounts/service-accounts.module';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    UsersModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [service_account],
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'sheetapi',
      password: 'sheetapi',
      database: 'sheetapi',
      entities: [User,Sheet],
      synchronize: true,
      autoLoadEntities: true,
    }),
    SheetsModule,
    ServiceAccountsModule,
    CacheModule.register(),
  ],
  controllers: [AppController, ApiController, LoginController, SheetsController, ServiceAccountsController],
  providers: [AppService, ApiService, RateLimiterService, SheetsService],
})
export class AppModule {
  constructor(private dataSource: DataSource) {};
}

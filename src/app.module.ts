import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {DataSource, Repository} from 'typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ApiController } from './api.controller';
import { ApiService } from './api.service';
import service_account from './config/service_account';
import { UsersModule } from "./users/users.module";
import { UsersService } from "./users/users.service";
import { User } from './users/user.entity';

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
      entities: [],
      synchronize: true,
      autoLoadEntities: true,
    }),
  ],
  controllers: [AppController, ApiController],
  providers: [AppService, ApiService],
})
export class AppModule {
  constructor(private dataSource: DataSource) {};
}

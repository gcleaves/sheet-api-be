import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ApiController } from "./api.controller";
import { ApiService } from "./api.service";
import service_account from './config/service_account';

@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true,
    load: [service_account],
  })],
  controllers: [AppController,ApiController],
  providers: [AppService,ApiService],
})
export class AppModule {}

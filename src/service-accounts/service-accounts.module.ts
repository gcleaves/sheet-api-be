import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceAccountsService } from './service-accounts.service';
import { ServiceAccountsController } from "./service-accounts.controller";
import { ServiceAccount } from "./service-account.entity";

@Module({
  imports: [TypeOrmModule.forFeature([ServiceAccount])],
  providers: [ServiceAccountsService],
  controllers: [ServiceAccountsController],
  exports: [TypeOrmModule, ServiceAccountsService]
})
export class ServiceAccountsModule {}

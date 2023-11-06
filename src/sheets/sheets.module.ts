import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SheetsService } from "./sheets.service";
import { SheetsController } from "./sheets.controller";
import { Sheet } from "./sheet.entity";

@Module({
    imports: [TypeOrmModule.forFeature([Sheet])],
    providers: [SheetsService],
    controllers: [SheetsController],
    exports: [TypeOrmModule, SheetsService],
})
export class SheetsModule {}

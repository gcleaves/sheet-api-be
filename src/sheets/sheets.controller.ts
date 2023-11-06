import {Controller, Get, Req} from '@nestjs/common';
import {Request} from 'express';
import {ConfigService} from "@nestjs/config";
import {SheetsService} from "./sheets.service";

@Controller('/api/sheets')
export class SheetsController {
    constructor(
        private configService: ConfigService,
        private sheetsService: SheetsService
    ) {}

    @Get()
    async getSheets(@Req() req: Request) {
        if(!req.session.user) throw {message:'You must log in', statusCode: 401};
        return await this.sheetsService.findBy({'user.id': req.session.user.id}) // user: req.session.user.id
    }
}

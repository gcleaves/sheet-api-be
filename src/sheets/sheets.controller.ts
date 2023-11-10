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

    @Get(':id')
    async getOneSheet(@Req() req: Request) {
        if(!req.session.user) throw {message:'You must log in', statusCode: 401};
        //const sheet = await this.sheetsService.findOne(+req.params.id) // user: req.session.user.id
        //return this.sheetsRepository.find({relations: ['user'], loadRelationIds: true, where: {"user.id": 14}});
        const sheet = await this.sheetsService.findOneWithOptions({
            relations: ['user'],
            loadRelationIds: true,
            where: {id: req.params.id}
        });
        if(req.session.user.id!==sheet.user as unknown as number) throw {message:'You cannot do this', statusCode: 403};
        return sheet;
    }
}

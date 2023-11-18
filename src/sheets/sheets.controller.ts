import {Controller, Delete, Get, Patch, Post, Req} from '@nestjs/common';
import {Request} from 'express';
import {ConfigService} from "@nestjs/config";
import {SheetsService} from "./sheets.service";
import {User} from "../users/user.entity"

@Controller('/api/sheets')
export class SheetsController {
    constructor(
        private configService: ConfigService,
        private sheetsService: SheetsService
    ) {}

    @Delete(':id')
    async deleteSheet(@Req() req: Request) {
        console.log('delete sheet', req.params)
        if(!req.session.user) throw {message:'You must log in', statusCode: 401};
        const exist = await this.sheetsService.exist({
            relations: ['user'],
            loadRelationIds: true,
            where: {id: +req.params.id, 'user.id': req.session.user.id}
        });

        if(! exist) throw {message:'Not found', statusCode: 404};
        return this.sheetsService.delete(+req.params.id);
    }

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

    @Patch(':id')
    async updateSheet(@Req() req: Request) {
        if(req.body && !req.body.sheet_id) throw {message:'missing sheet_id', statusCode: 400};
        const sheet = await this.sheetsService.findOneWithOptions({
            relations: ['user'],
            loadRelationIds: true,
            where: {id: req.params.id, 'user.id': req.session.user.id}
        });
        if(!sheet) throw {message:'Not found', statusCode: 404};
        return this.sheetsService.update(sheet.id, req.body);
    }

    @Post()
    async createSheet(@Req() req: Request) {
        console.log('createSheet', req.body);
        if(req.body && !req.body.sheet_id) throw {message:'missing sheet_id', statusCode: 400};
        if(!req.session.user) throw {message:'You must log in', statusCode: 401};
        const newSheet = {
            name: req.body.name,
            sheet_id: req.body.sheet_id,
            api_keys: req.body.api_keys,
            user: {id: req.session.user.id} as User
        }
        return await this.sheetsService.create(newSheet);
    }
}

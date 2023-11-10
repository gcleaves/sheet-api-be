import { Controller, Get, Param, Req, Res, Patch, Body, Put, Delete, UseGuards } from '@nestjs/common';
import {Request, Response} from 'express';
import {ApiService} from './api.service';
import {ConfigService} from '@nestjs/config';
import { SheetInsertDto, SheetQueryDto, SheetUpdateDto } from './dto/sheet-update.dto';
import {RateLimiterGuard} from "./rate-limiter/rate-limiter.guard";
import {RateLimiter, RateLimiterKey} from "./rate-limiter/rate-limiter.decorator";
import {UsersService} from "./users/users.service";

@Controller('/api')
@RateLimiter({points: 60, duration: 10, consume: 1})
@UseGuards(RateLimiterGuard)
export class ApiController {
    constructor(
        private readonly apiService: ApiService,
        private configService: ConfigService,
        private userService: UsersService
    ) {}

    @Get('settings')
    async getSettings(@Req() req: Request, @Res() res: Response) {
        if(!req.session.user) {
            throw {message: 'you must log in', statusCode: 401}
        }
        const sub = req.session.user?.sub;
        console.log('sub', sub);
        const user = await this.userService.findOne(req.session.user.sub)
        console.log('user', user);

        if(!user) {
            console.log('no user found');
            res.status(401).send('No way Jose.');
            req.session.user = null;
            return;
        }
        req.session.user = user;
        res.send(user);
        return;
    }

    @Patch('settings')
    async updateSettings(@Req() req: Request, @Res() res: Response) {
        console.log('patch settings body', req.body);
        if(!req.session.user) {
            throw {message: 'you must log in', statusCode: 401}
        }
        const user = await this.userService.findOne(req.session.user.sub)
        if(!user) {
            throw {message: 'you must log in', statusCode: 401}
        }

        let sa;
        try {
            sa = JSON.parse(req.body.service_account)
        } catch (e) {
            throw {message: 'JSON error', statusCode: 400}
        }
        if (
            !(typeof sa === 'object' &&
            !Array.isArray(sa) &&
            sa !== null)
        ) {
            throw {message: 'JSON error, must be an object', statusCode: 400}
        }

        res.send(await this.userService.update(req.session.user.sub, {
            access_method: req.body.access_method,
            service_account: sa
        }));

        return;
    }


    @Get('sheet/:sheetId')
    getAllRows(@Param() params: any, @Req() request: Request): Promise<Record<string, any>> {
        const sheet: string = request.query._sheet as string;
        const limit: number = +request.query._limit as number;
        const offset: number = +request.query._offset as number;

        return this.apiService.getAllRows(params.sheetId, sheet, limit, offset);
    }

    @Get('sheet/:sheetId/search')
    search(@Param() params: any, @Req() request: Request): any {
        const sheet: string = request.query._sheet as string;

        const predicates = {...request.query};
        delete predicates._sheet;

        return this.apiService.search(params.sheetId, sheet, predicates, 'and');
    }

    @Get('sheet/:sheetId/search_or')
    search_or(@Param() params: any, @Req() request: Request): Record<string, any> {
        const sheet: string = request.query._sheet as string;

        const predicates = {...request.query};
        delete predicates._sheet;

        return this.apiService.search(params.sheetId, sheet, predicates, 'or');
    }

    @Patch('sheet/:sheetId')
    update(@Param() params: any, @Req() request: Request, @Body() body: SheetUpdateDto): any {
        const sheetName: string = request.query._sheet as string;
        const query = body.query;
        const update = body.update;

        return this.apiService.update(params.sheetId, sheetName, query, update);
    }

    @Put('sheet/:sheetId')
    insert(@Param() params: any, @Req() request: Request, @Body() body: SheetInsertDto): any {
        const sheetName: string = request.query._sheet as string;
        return this.apiService.insert(params.sheetId, sheetName, body.insert);
    }

    @Delete('sheet/:sheetId')
    delete(@Param() params: any, @Req() request: Request, @Body() query: SheetQueryDto): any {
        const sheetName: string = request.query._sheet as string;
        return this.apiService.delete(params.sheetId, sheetName, query);
    }
}

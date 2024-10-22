import { Controller, Get, Param, Req, Res, Patch,
    Body, Put, Delete, UseGuards, UseInterceptors, Inject } from '@nestjs/common';
import {Request, Response} from 'express';
import {ApiService} from './api.service';
import {ConfigService} from '@nestjs/config';
import { SheetInsertDto, SheetQueryDto, SheetUpdateDto } from './dto/sheet-update.dto';
import {RateLimiterGuard} from "./rate-limiter/rate-limiter.guard";
import {RateLimiter, RateLimiterKey} from "./rate-limiter/rate-limiter.decorator";
import {UsersService} from "./users/users.service";
import {SheetsService} from "./sheets/sheets.service";
import {User} from './users/user.entity';
import {CACHE_MANAGER} from "@nestjs/cache-manager";
import {Cache} from "cache-manager";

@Controller('/api')
@RateLimiter({points: 60, duration: 10, consume: 1})
@UseGuards(RateLimiterGuard)
export class ApiController {
    constructor(
        private readonly apiService: ApiService,
        private configService: ConfigService,
        private userService: UsersService,
        private sheetService: SheetsService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache
    ) {}

    @Delete('refreshToken')
    async removeAccess(@Req() req: Request) {
        if(!req.session.user) {
            throw {message: 'you must log in', statusCode: 401}
        }
        const user = await this.userService.findOne(req.session.user.sub)
        if(user.id != req.body.user_id) throw {message: 'Please refresh the page', statusCode: 400}
        if(!user) {
            throw {message: 'you must log in', statusCode: 401}
        }
        await this.cacheManager.del('token:'+req.session.user.sub);
        await this.apiService.revokeToken(user.refresh_token);
        return (await this.userService.update(req.session.user.sub, {
            refresh_token: null,
            access_method: "service_account"
        }));
    }

    @Get('clearCache')
    async clearCache() {
        await this.cacheManager.reset();
        return 'OK';
    }

    @Get('settings')
    async getSettings(@Req() req: Request): Promise<User> {
        if(!req.session.user) {
            throw {message: 'you must log in', statusCode: 401}
        }
        const sub = req.session.user?.sub;
        //console.log('sub', sub);
        const user: User = await this.userService.findOne(req.session.user.sub)
        //console.log('user', user);

        if(!user) {
            console.log('no user found');
            //res.status(401).send('No way Jose.');
            req.session.user = null;
            throw {message: 'No way Jose.', statusCode: 401}
        }
        req.session.user = user;
        return user;
    }

    @Patch('settings')
    async updateSettings(@Req() req: Request) {
        //console.log('patch settings body', req.body);
        if(!req.session.user) {
            throw {message: 'you must log in', statusCode: 401}
        }
        const user = await this.userService.findOne(req.session.user.sub)
        if(user.id != req.body.user_id) throw {message: 'Please refresh the page', statusCode: 400}
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
        await this.cacheManager.del('token:'+req.session.user.sub);

        return (await this.userService.update(req.session.user.sub, {
            access_method: req.body.access_method,
            service_account: sa
        }));
    }

    @Get('sheet/:uid')
    async getAllRows(@Param() params: any, @Req() req: Request): Promise<Record<string, any>> {
        const theSheet = await this.sheetService.findOneWithOptions({
            relations: ['user'],
            loadRelationIds: true,
            where: {uid: params.uid}
        });
        //console.log(theSheet, request.headers['x-api-key']);
        if(!theSheet) throw {message: 'Sheet not found.', statusCode: 404}

        // Check API Key
        if(theSheet.api_keys.read && (! [req.headers['x-api-key'],req.query['_x-api-key']].includes(theSheet.api_keys.read))) {
            throw {message: 'Unauthorized, confirm x-api-key header.', statusCode: 403};
        }

        const sheet: string = req.query._sheet as string;
        const limit: number = +req.query._limit as number;
        const offset: number = +req.query._offset as number;

        return this.apiService.getAllRows(params.uid, sheet, limit, offset);
    }

    @Get('sheet/:uid/search')
    async search(@Param() params: any, @Req() req: Request): Promise<any> {
        const sheet: string = req.query._sheet as string;
        console.log('search query', req.query);

        const theSheet = await this.sheetService.findOneWithOptions({
            //relations: ['user'],
            //loadRelationIds: true,
            where: {uid: params.uid} //, 'user.id': req.session.user.id}
        });
        //console.log(theSheet, request.headers['x-api-key']);
        if(!theSheet) throw {message: 'Sheet not found.', statusCode: 404}

        // Check API Key
        if(theSheet.api_keys.read && (! [req.headers['x-api-key'],req.query['_x-api-key']].includes(theSheet.api_keys.read))) {
            throw {message: 'Unauthorized, confirm x-api-key header.', statusCode: 403};
        }

        const predicates = {...req.query};
        delete predicates._sheet;
        delete predicates['_x-api-key'];

        return this.apiService.search(params.uid, sheet, predicates, 'and');
    }

    @Get('sheet/:uid/search_or')
    async search_or(@Param() params: any, @Req() req: Request): Promise<Record<string, any>> {
        const sheet: string = req.query._sheet as string;

        const theSheet = await this.sheetService.findOneWithOptions({
            //relations: ['user'],
            //loadRelationIds: true,
            where: {uid: params.uid } //, 'user.id': req.session.user.id}
        });
        //console.log(theSheet, request.headers['x-api-key']);
        if(!theSheet) throw {message: 'Sheet not found.', statusCode: 404}

        // Check API Key
        if(theSheet.api_keys.read && (! [req.headers['x-api-key'],req.query['_x-api-key']].includes(theSheet.api_keys.read))) {
            throw {message: 'Unauthorized, confirm x-api-key header.', statusCode: 403};
        }

        const predicates = {...req.query};
        delete predicates._sheet;

        return this.apiService.search(params.uid, sheet, predicates, 'or');
    }

    @Patch('sheet/:uid')
    async update(@Param() params: any, @Req() req: Request, @Body() body: SheetUpdateDto): Promise<any> {
        const sheetName: string = req.query._sheet as string;
        const query = body.query;
        const update = body.update;

        const theSheet = await this.sheetService.findOneWithOptions({
            relations: ['user'],
            loadRelationIds: true,
            where: {uid: params.uid}
        });
        //console.log(theSheet, request.headers['x-api-key']);
        if(!theSheet) throw {message: 'Sheet not found.', statusCode: 404}

        // Check API Key
        if(theSheet.api_keys.write && (! [req.headers['x-api-key'],req.query['_x-api-key']].includes(theSheet.api_keys.write))) {
            throw {message: 'Unauthorized, confirm x-api-key header.', statusCode: 403};
        }

        return this.apiService.update(params.uid, sheetName, query, update);
    }

    @Put('sheet/:uid')
    async insert(@Param() params: any, @Req() req: Request, @Body() body: SheetInsertDto): Promise<any> {
        const sheetName: string = req.query._sheet as string;

        const theSheet = await this.sheetService.findOneWithOptions({
            relations: ['user'],
            loadRelationIds: true,
            where: {uid: params.uid}
        });
        //console.log(theSheet, request.headers['x-api-key']);
        if(!theSheet) throw {message: 'Sheet not found.', statusCode: 404}

        // Check API Key
        if(theSheet.api_keys.write && (! [req.headers['x-api-key'],req.query['_x-api-key']].includes(theSheet.api_keys.write))) {
            throw {message: 'Unauthorized, confirm x-api-key header.', statusCode: 403};
        }

        return this.apiService.insert(params.uid, sheetName, body.insert, body.append);
    }

    @Delete('sheet/:uid')
    async delete(@Param() params: any, @Req() req: Request, @Body() query: SheetQueryDto): Promise<any> {
        const sheetName: string = req.query._sheet as string;

        const theSheet = await this.sheetService.findOneWithOptions({
            relations: ['user'],
            loadRelationIds: true,
            where: {uid: params.uid}
        });
        //console.log(theSheet, request.headers['x-api-key']);
        if(!theSheet) throw {message: 'Sheet not found.', statusCode: 404}

        // Check API Key
        if(theSheet.api_keys.write && (! [req.headers['x-api-key'],req.query['_x-api-key']].includes(theSheet.api_keys.write))) {
            throw {message: 'Unauthorized, confirm x-api-key header.', statusCode: 403};
        }

        return this.apiService.delete(params.uid, sheetName, query);
    }
}

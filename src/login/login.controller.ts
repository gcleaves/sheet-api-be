import { Controller, Get, Req, Res, Redirect, HttpRedirectResponse } from '@nestjs/common';
import { Request, Response } from 'express';
import { google } from 'googleapis';
import { JWT, OAuth2Client } from 'google-auth-library'
import * as jwt from 'jsonwebtoken';
import {ConfigService} from "@nestjs/config";
import {UsersService} from "../users/users.service";
import { IdTokenDto } from "../dto/id-token.dto";

@Controller()
export class LoginController {
    readonly oauth2Client;

    constructor(private configService: ConfigService, private userService: UsersService) {
        this.oauth2Client = new OAuth2Client(
            this.configService.get<string>('GOOGLE_CLIENT_ID'),
            this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
            this.configService.get<string>('API_BASE') + '/login/oauth2callback'
        );
    }

    @Get('/getAccessLink')
    getAccessLink(@Req() req: Request) {
        const scopes = ['profile', 'email','https://www.googleapis.com/auth/spreadsheets'];
        const url = this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes
        });
        return url;
    }

    @Get('/logout')
    logout(@Req() req: Request, @Res() res: Response) {
        req.session.user = null;

        if(req.query.redirect) {
            res.redirect(this.configService.get<string>('WEB_BASE')+req.query.redirect);
            return;
        } else {
            res.send("session erased");
            return;
        }
        //return "session erased";
    }

    @Get('/login')
    //@Redirect()
    login(@Req() req: Request, @Res() res: Response): string {
        if(req.session.user) {
            res.redirect(302, this.configService.get<string>('WEB_BASE') + '/app');
            return;
            //response.send('you are already logged in');
            //return;
        }
        console.log('no user');
        const authOpts: any = {scope: ['profile', 'email']};
        if(req.query.scope==='spreadsheets') {
            authOpts.scope.push('https://www.googleapis.com/auth/spreadsheets');
            authOpts.access_type = 'offline';
        }
        const url = this.oauth2Client.generateAuthUrl(authOpts);
        res.redirect(302, url);
        return;

        //return {url, statusCode: 302}
    }

    @Redirect()
    @Get('/login/oauth2callback')
    async getTokens(@Req() request: Request): Promise<HttpRedirectResponse> {
        const { tokens } = await this.oauth2Client.getToken(request.query.code as string)
        this.oauth2Client.setCredentials(tokens);
        //console.log(tokens);

        const decoded = (await this.oauth2Client.verifyIdToken({
            idToken: tokens.id_token,
            audience: '654025721462-l4phhfln01t3og339je9p9hbcmm2mf0v.apps.googleusercontent.com',
        })).payload;
        console.log(decoded);

        let user = await this.userService.findOne(decoded.sub as string|null);
        //console.log('user',user);
        if( !user ) {
            const newUser: any = {
                name: decoded.name,
                sub: decoded.sub,
                email: decoded.email,
                given_name: decoded.given_name,
                family_name: decoded.family_name,
                refresh_token: tokens.refresh_token,
                service_account: {}
            }
            //if(/https:\/\/www.googleapis.com\/auth\/spreadsheets/.test(tokens.scope)) {
            //    newUser.refresh_token = tokens.refresh_token;
            //}
            user = await this.userService.create(newUser);
        } else {
            if(tokens.refresh_token) {
                await this.userService.update(user.sub, {
                    refresh_token: tokens.refresh_token,
                    access_method: 'oauth'
                });
            }
        }

        request.session.user = user;

        return {
            url: this.configService.get<string>('WEB_BASE')+'/app',
            statusCode: 302
        }
    }

    @Get('/login/check')
    async check(@Req() request: Request) {
        //console.log(request.session.user);
        return request.session.user || {error: 'not logged in'};
    }
}


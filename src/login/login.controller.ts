import { Controller, Get, Req, Res, Redirect, HttpRedirectResponse } from '@nestjs/common';
import { Request, Response } from 'express';
import { google } from 'googleapis';
import * as jwt from 'jsonwebtoken';
import {ConfigService} from "@nestjs/config";
import {UsersService} from "../users/users.service";
import { IdTokenDto } from "../dto/id-token.dto";

@Controller()
export class LoginController {
    readonly oauth2Client;

    constructor(private configService: ConfigService, private userService: UsersService) {
        this.oauth2Client = new google.auth.OAuth2(
            this.configService.get<string>('GOOGLE_CLIENT_ID'),
            this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
            this.configService.get<string>('API_BASE') + '/login/oauth2callback'
        );
    }

    @Get('/logout')
    logout(@Req() req: Request, @Res() res: Response) {
        req.session.user = null;
        if(req.query.redirect) {
            res.redirect(this.configService.get<string>('WEB_BASE')+req.query.redirect);
        } else {
            res.send("session erased");
        }
        //return "session erased";
    }

    @Get('/login')
    //@Redirect()
    login(@Req() request: Request, @Res() response: Response): string {
        if(request.session.user) {
            response.redirect(302, this.configService.get<string>('WEB_BASE') + '/app');
            return;
            //response.send('you are already logged in');
            //return;
        }
        console.log('no user');

        const scopes = ['profile', 'email'];
        const url = this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes
        });
        response.redirect(302, url);
        return;

        //return {url, statusCode: 302}
    }

    @Redirect()
    @Get('/login/oauth2callback')
    async getTokens(@Req() request: Request): Promise<HttpRedirectResponse> {
        const { tokens } = await this.oauth2Client.getToken(request.query.code as string)
        this.oauth2Client.setCredentials(tokens);
        console.log(tokens);

        const decoded: IdTokenDto = jwt.verify(
            tokens.id_token,
            '-----BEGIN CERTIFICATE-----\nMIIDJzCCAg+gAwIBAgIJAO5q5hCX9S+zMA0GCSqGSIb3DQEBBQUAMDYxNDAyBgNV\nBAMMK2ZlZGVyYXRlZC1zaWdub24uc3lzdGVtLmdzZXJ2aWNlYWNjb3VudC5jb20w\nHhcNMjMxMTA0MDQzODA0WhcNMjMxMTIwMTY1MzA0WjA2MTQwMgYDVQQDDCtmZWRl\ncmF0ZWQtc2lnbm9uLnN5c3RlbS5nc2VydmljZWFjY291bnQuY29tMIIBIjANBgkq\nhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuB+3s136B/Vcme1zGQEg+Avs31/voau8\nBPKtvbYhB0QOHTtrXCF/wxIH5vWjl+5ts8up8Iy2kVnaItsecGohBAy/0kRgq8oi\n+n/cZ0i5bspAX5VW0peh/QU3KTlKSBaz3ZD9xMCDWuJFFniHuxLtJ4QtL4v2oDD3\npBPNRPyIcZ/LKhH3+Jm+EAvubI5+6lB01zkP5x8f2mp2upqAmyex0jKFka2e0DOB\navmGsGvKHKtTnE9oSOTDlhINgQPohoSmir89NRbEqqzeZVb55LWRl/hkiDDOZmcM\n/oJ8iUbm6vQu3YwCy+ef9wGYEij5GOWLmpYsws5vLVtTE2U+0C/ItQIDAQABozgw\nNjAMBgNVHRMBAf8EAjAAMA4GA1UdDwEB/wQEAwIHgDAWBgNVHSUBAf8EDDAKBggr\nBgEFBQcDAjANBgkqhkiG9w0BAQUFAAOCAQEAifQankV6Ca4UQ9MvTX4KlsaVV6WR\n1FL2ZwRPHwFQnw3hFJrHKdQBvCS1339G1uguCOi0CQQJmQauSvRureJ/80Fc/j3c\nwEWQgBhuKCHiQbIMFpVoljsVsF91E0FvZ8eJJ5/y7QB3Ww68FavXNjZ62GaYp8aw\nEdqJdqNFaIv7yWzOO27filjzF3H6VJG7ucx0P6JCCCC6HSii3o1lkRISvSTcevqZ\nsFdbJEqtVU70siOHxWxMqRopetiTEAsbvwiicdZ6flZqtnxKqB6YEb6TocWpzGvd\nVKxzByXdPJbyYvAnvusborJZPHKbleZjyonK+cmsOU6N1Yn/FUxKKhFXEg==\n-----END CERTIFICATE-----\n',
            { audience: '654025721462-l4phhfln01t3og339je9p9hbcmm2mf0v.apps.googleusercontent.com' }
        ) as IdTokenDto;
        //console.log(decoded);
        let user = await this.userService.findOne(decoded.sub as string|null);
        //console.log('user',user);
        if( !user ) {
            const newUser = {
                name: decoded.name,
                sub: decoded.sub,
                email: decoded.email,
                given_name: decoded.given_name,
                family_name: decoded.family_name
            }
            user = await this.userService.create(newUser);
        }
        request.session.user = user;

        return {
            url: 'http://localhost:3333/app',
            statusCode: 302
        }
    }

    @Get('/login/check')
    async check(@Req() request: Request) {
        console.log(request.session.user);
        return request.session.user || {error: 'not logged in'};
    }
}


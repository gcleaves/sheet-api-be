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
            '-----BEGIN CERTIFICATE-----\nMIIDJzCCAg+gAwIBAgIJAM4pto97iqtbMA0GCSqGSIb3DQEBBQUAMDYxNDAyBgNV\nBAMMK2ZlZGVyYXRlZC1zaWdub24uc3lzdGVtLmdzZXJ2aWNlYWNjb3VudC5jb20w\nHhcNMjMxMDI3MDQzODAzWhcNMjMxMTEyMTY1MzAzWjA2MTQwMgYDVQQDDCtmZWRl\ncmF0ZWQtc2lnbm9uLnN5c3RlbS5nc2VydmljZWFjY291bnQuY29tMIIBIjANBgkq\nhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAq5hcowR4IuPiSvHbwj9Rv9j2XRnrgbAA\nFYBqoLBwUV5GVIiNPKnQBYa8ZEIK2naj9gqpo3DU9lx7d7RzeVlzCS5eUA2LV94+\n+KbT0YgIJnApj5+hyDIaevI1Sf2YQr/cntgVLvxqfW1n9ZvbQSitz5Tgh0cplZvu\niWMFPu4/mh6B3ShEKIl+qi+h0cZJlRcIf0ZwkfcDOTE8bqEzWUvlCpCH9FK6Mo9Y\nLjw5LroBcHdUbOg3Keu0uW5SCEi+2XBQgCF6xF3kliciwwnv2HhCPyTiX0paM/sT\n2uKspYock+IQglQ2TExoJqbYZe6CInSHiAA68fkSkJQDnuRZE7XTJQIDAQABozgw\nNjAMBgNVHRMBAf8EAjAAMA4GA1UdDwEB/wQEAwIHgDAWBgNVHSUBAf8EDDAKBggr\nBgEFBQcDAjANBgkqhkiG9w0BAQUFAAOCAQEAIsM3a095WZRG6zeApt/cmsaYoZH8\nfmRxca+AqA2Twd39P3k4rUQtMjGxA7DT0VZkSjlKSra+r2368xh0Fn/4hrbqWhe2\n5TjXN7k2JXXIJjGsulsCm6tD2TOQNWVvPnPsos+CnNDAohASc2Q5cvBXkkgjKMJP\nbaN1PT32c5YnO8FKYErVnSNI2t/zPnxnP6a7Da8oraI+Yn99NZAopAwIzzsZh3/6\n+C1HXyIBDa8VHZLXBjCWCkpluSx8D1BihCvJEDRAQ1FpXV4Z0AnrsRla5tVI1BFb\n3ObnkN0fA2m3o2f8j7Udm+SylzftKwBiTyeOQ92nkvXe27wmSAXLR53Etw==\n-----END CERTIFICATE-----\n',
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


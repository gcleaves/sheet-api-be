import { Controller, Get, Req, Redirect, HttpRedirectResponse } from '@nestjs/common';
import { Request } from 'express';
import {google, oauth2_v2} from 'googleapis';
import * as jwt from 'jsonwebtoken';
import {ConfigService} from "@nestjs/config";
import Oauth2 = oauth2_v2.Oauth2;
import {OAuth2Client} from "google-auth-library/build/src/auth/oauth2client";



@Controller()
export class LoginController {
    readonly oauth2Client;

    constructor(private configService: ConfigService) {
        this.oauth2Client = new google.auth.OAuth2(
            this.configService.get<string>('GOOGLE_CLIENT_ID'),
            this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
            'http://localhost:3000/login/oauth2callback'
        );
    }

    @Get('/login')
    @Redirect()
    login(@Req() request: Request): HttpRedirectResponse {
        const scopes = ['profile', 'email'];
        const url = this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes
        });

        return {
            url,
            statusCode: 302
        }
    }

    @Get('/login/oauth2callback')
    async getTokens(@Req() request: Request) {
        const { tokens } = await this.oauth2Client.getToken(request.query.code as string)
        this.oauth2Client.setCredentials(tokens);
        console.log(tokens);

        const decoded = jwt.verify(
            tokens.id_token,
            '-----BEGIN CERTIFICATE-----\nMIIDJzCCAg+gAwIBAgIJAM4pto97iqtbMA0GCSqGSIb3DQEBBQUAMDYxNDAyBgNV\nBAMMK2ZlZGVyYXRlZC1zaWdub24uc3lzdGVtLmdzZXJ2aWNlYWNjb3VudC5jb20w\nHhcNMjMxMDI3MDQzODAzWhcNMjMxMTEyMTY1MzAzWjA2MTQwMgYDVQQDDCtmZWRl\ncmF0ZWQtc2lnbm9uLnN5c3RlbS5nc2VydmljZWFjY291bnQuY29tMIIBIjANBgkq\nhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAq5hcowR4IuPiSvHbwj9Rv9j2XRnrgbAA\nFYBqoLBwUV5GVIiNPKnQBYa8ZEIK2naj9gqpo3DU9lx7d7RzeVlzCS5eUA2LV94+\n+KbT0YgIJnApj5+hyDIaevI1Sf2YQr/cntgVLvxqfW1n9ZvbQSitz5Tgh0cplZvu\niWMFPu4/mh6B3ShEKIl+qi+h0cZJlRcIf0ZwkfcDOTE8bqEzWUvlCpCH9FK6Mo9Y\nLjw5LroBcHdUbOg3Keu0uW5SCEi+2XBQgCF6xF3kliciwwnv2HhCPyTiX0paM/sT\n2uKspYock+IQglQ2TExoJqbYZe6CInSHiAA68fkSkJQDnuRZE7XTJQIDAQABozgw\nNjAMBgNVHRMBAf8EAjAAMA4GA1UdDwEB/wQEAwIHgDAWBgNVHSUBAf8EDDAKBggr\nBgEFBQcDAjANBgkqhkiG9w0BAQUFAAOCAQEAIsM3a095WZRG6zeApt/cmsaYoZH8\nfmRxca+AqA2Twd39P3k4rUQtMjGxA7DT0VZkSjlKSra+r2368xh0Fn/4hrbqWhe2\n5TjXN7k2JXXIJjGsulsCm6tD2TOQNWVvPnPsos+CnNDAohASc2Q5cvBXkkgjKMJP\nbaN1PT32c5YnO8FKYErVnSNI2t/zPnxnP6a7Da8oraI+Yn99NZAopAwIzzsZh3/6\n+C1HXyIBDa8VHZLXBjCWCkpluSx8D1BihCvJEDRAQ1FpXV4Z0AnrsRla5tVI1BFb\n3ObnkN0fA2m3o2f8j7Udm+SylzftKwBiTyeOQ92nkvXe27wmSAXLR53Etw==\n-----END CERTIFICATE-----\n',
            {audience:'654025721462-l4phhfln01t3og339je9p9hbcmm2mf0v.apps.googleusercontent.com'}
        );
        console.log(decoded);
    }

}


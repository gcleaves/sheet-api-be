import {Controller, Get, Req} from '@nestjs/common';
import {ServiceAccountsService} from "./service-accounts.service";
import {Request} from "express";

@Controller('/api/service-accounts')
export class ServiceAccountsController {
    constructor(
        private serviceAccountsService: ServiceAccountsService
    ) {}

    @Get()
    async getServiceAccounts(@Req() req: Request) {
        if(!req.session.user) throw {message:'You must log in', statusCode: 401};
        return await this.serviceAccountsService.findBy({'user.id': req.session.user.id}) // user: req.session.user.id
    }

}

import { Injectable } from '@nestjs/common';
import {InjectRepository} from "@nestjs/typeorm";
import {Repository} from "typeorm";
import {ServiceAccount} from "./service-account.entity";

@Injectable()
export class ServiceAccountsService {
    constructor(
        @InjectRepository(ServiceAccount)
        private sheetsRepository: Repository<ServiceAccount>
    ) {}

    findBy(where): Promise<ServiceAccount[]> {
        //console.log(where);
        //return this.sheetsRepository.find({relations: ['user'], loadRelationIds: true, where: {"user.id": 14}});

        return this.sheetsRepository.findBy(where);
    }
}

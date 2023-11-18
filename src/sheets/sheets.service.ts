import { Injectable } from '@nestjs/common';
import {InjectRepository} from "@nestjs/typeorm";
import {Repository} from "typeorm";
import {Sheet} from "./sheet.entity";
import { UsersService } from "../users/users.service";
import { User } from "../users/user.entity";
import { FindOptionsWhere} from "typeorm";
import ShortUniqueId from 'short-unique-id'

const uid = new ShortUniqueId({ length: 10, dictionary:[
        '0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f',
        'g','h','i','j','k','m','n','o','p','q','r','s','t','u','v','w','x',
        'y','z','A','B','C','D','E','F','G','H','J','K','L','M','N','P','Q',
        'R','S','T','U','V','W','X','Y','Z'
    ]});

@Injectable()
export class SheetsService {
    constructor(
        @InjectRepository(Sheet)
        private sheetsRepository: Repository<Sheet>
    ) {}

    findAll(): Promise<Sheet[]> {
        return this.sheetsRepository.find();
    }

    findBy(where): Promise<Sheet[]> {
        //console.log(where);
        //return this.sheetsRepository.find({relations: ['user'], loadRelationIds: true, where: {"user.id": 14}});

        return this.sheetsRepository.findBy(where);
    }

    findOneWithOptions(options): Promise<Sheet | null> {
        //if(!id) return null;
        return this.sheetsRepository.findOne(options);
    }

    findOne(id: number): Promise<Sheet | null> {
        if(!id) return null;
        return this.sheetsRepository.findOneBy({ id });
    }

    async create(sheet: Partial<Sheet>): Promise<Sheet> {
        sheet.uid = uid.rnd(10);
        const newSheet = this.sheetsRepository.create(sheet);
        return this.sheetsRepository.save(newSheet);
    }

    async update(id: number, sheet: Partial<Sheet>): Promise<Sheet> {
        if(!id) return null;
        await this.sheetsRepository.update(id, sheet);
        return this.sheetsRepository.findOne({where: {id}});
    }

    async delete(id: number): Promise<void> {
        if(!id) throw new Error('You must provide a id');
        await this.sheetsRepository.delete(id);
    }

    exist(options): Promise<boolean> {
        return this.sheetsRepository.exist(options);
    }
}

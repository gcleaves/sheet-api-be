import { Injectable } from '@nestjs/common';
import {InjectRepository} from "@nestjs/typeorm";
import {Repository} from "typeorm";
import {Sheet} from "./sheet.entity";
import { UsersService } from "../users/users.service";
import { User } from "../users/user.entity";
import { FindOptionsWhere} from "typeorm";

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

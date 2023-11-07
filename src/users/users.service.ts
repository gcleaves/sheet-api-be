import {Injectable} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {User} from './user.entity';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
    ) {}

    findAll(): Promise<User[]> {
        return this.usersRepository.find();
    }

    findOneWithRelations(options): Promise<User | null> {
        //if(!sub) return null;
        return this.usersRepository.findOne(options);
    }

    findOne(sub: string): Promise<User | null> {
        if(!sub) return null;
        return this.usersRepository.findOneBy({ sub });
    }

    async create(user: Partial<User>): Promise<User> {
        const newuser = this.usersRepository.create(user);
        return this.usersRepository.save(newuser);
    }

    async update(sub: string, user: Partial<User>): Promise<User> {
        if(!sub) return null;
        await this.usersRepository.update(sub, user);
        return this.usersRepository.findOne({where: {sub}});
    }

    async delete(sub: string): Promise<void> {
        if(!sub) throw new Error('You must provide a sub');
        await this.usersRepository.delete(sub);
    }
}

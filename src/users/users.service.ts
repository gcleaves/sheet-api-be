import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  findOne(id: number): Promise<User | null> {
    return this.usersRepository.findOneBy({ id });
  }

    async create(user: Partial<User>): Promise<User> {
        const newuser = this.usersRepository.create(user);
        return this.usersRepository.save(newuser);
    }

    async update(id: number, user: Partial<User>): Promise<User> {
        await this.usersRepository.update(id, user);
        return this.usersRepository.findOne({ where: { id } });
    }

    async delete(id: number): Promise<void> {
        await this.usersRepository.delete(id);
    }
}

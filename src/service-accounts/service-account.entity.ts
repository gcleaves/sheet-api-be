import {Entity, Column, PrimaryGeneratedColumn, ManyToOne} from 'typeorm';
import {User} from "../users/user.entity";

@Entity()
export class ServiceAccount {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({type: 'json'})
  json: {};

  @ManyToOne(type => User, user => user.id)
  user: User;
}

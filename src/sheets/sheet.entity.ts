import {Entity, Column, PrimaryGeneratedColumn, ManyToOne, Index} from 'typeorm';
import {User} from "../users/user.entity";

interface ApiKeys {
  read: string | null,
  write: string | null,
}

@Entity()
export class Sheet {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({unique: true})
  @Column()
  uid: string;

  @Column( {nullable: false})
  sheet_id: string;

  @Column({ nullable: true })
  name: string;

  @Column({type: 'json', nullable: true })
  api_keys: ApiKeys;

  @ManyToOne(type => User, user => user.id)
  user: User;
}

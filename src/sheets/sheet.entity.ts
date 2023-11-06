import {Entity, Column, PrimaryGeneratedColumn, ManyToOne} from 'typeorm';
import {User} from "../users/user.entity";

@Entity()
export class Sheet {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false })
  sheet_id: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: false })
  api_key: string;

  @ManyToOne(type => User, user => user.id)
  user: User;
}

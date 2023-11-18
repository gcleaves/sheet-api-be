import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import {Sheet} from "../sheets/sheet.entity";
import { Exclude, instanceToPlain, Expose } from 'class-transformer';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: null })
  given_name: string;

  @Column({ default: null })
  family_name: string;

  @Column({ default: null })
  name: string;

  @Column()
  email: string;

  @Column()
  sub: string;

  @Exclude({ toPlainOnly: true })
  @Column({nullable: true})
  refresh_token: string;

  @Column({ default: 'service_account' })
  access_method: 'service_account'|'oauth';

  @Column({type: 'json', nullable: true})
  service_account: {
    client_email: string,
    private_key: string
  };

  @OneToMany(type => Sheet, sheet => sheet.user, {eager: false})
  sheets: Sheet[];

  @Expose()
  get hasRefreshToken() {
    return (this.refresh_token) ? true : false;
  }

  toJSON() {
    //if(this.service_account) delete this.service_account.private_key;
    return instanceToPlain(this);
  }
}

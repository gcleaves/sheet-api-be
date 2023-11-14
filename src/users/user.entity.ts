import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import {Sheet} from "../sheets/sheet.entity";

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

  @Column({select: false})
  refresh_token: string;

  @Column({ default: 'service_account' })
  access_method: 'service_account'|'oauth';

  @Column({type: 'json'})
  service_account: {
    client_email: string,
    private_key: string
  };

  @OneToMany(type => Sheet, sheet => sheet.user, {eager: false})
  sheets: Sheet[];

  //@OneToMany(type => ServiceAccount, serviceAccount => serviceAccount.user, {eager: false})
  //service_accounts: ServiceAccount[];
}

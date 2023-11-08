import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import {Sheet} from "../sheets/sheet.entity";
import {ServiceAccount} from "../service-accounts/service-account.entity";

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

  @Column({ default: 'service_account' })
  access_method: string;

  @Column({type: 'json'})
  service_account: {};

  @OneToMany(type => Sheet, sheet => sheet.user, {eager: false})
  sheets: Sheet[];

  //@OneToMany(type => ServiceAccount, serviceAccount => serviceAccount.user, {eager: false})
  //service_accounts: ServiceAccount[];
}

import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

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

  @Column({ default: null })
  service_account: string;
}

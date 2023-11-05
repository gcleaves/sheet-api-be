import { Injectable } from '@nestjs/common';
import { UsersService } from './users/users.service';
import { User } from './users/user.entity';

@Injectable()
export class AppService {
  constructor(private userService: UsersService) {}

  getHello(): string {
    const u = new User();
    //u.lastName = 'Cleaves'
    //this.userService.create(u)
    return 'Hello World! geoff';

  }
}

import { registerAs } from '@nestjs/config';
import * as sad from './service_account.json'

export default registerAs('service_account', () => sad);

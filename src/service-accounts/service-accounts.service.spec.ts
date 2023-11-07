import { Test, TestingModule } from '@nestjs/testing';
import { ServiceAccountsService } from './service-account.service';

describe('ServiceAccountService', () => {
  let service: ServiceAccountsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ServiceAccountsService],
    }).compile();

    service = module.get<ServiceAccountsService>(ServiceAccountsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

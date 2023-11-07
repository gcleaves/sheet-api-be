import { Test, TestingModule } from '@nestjs/testing';
import { ServiceAccountsController } from './service-account.controller';

describe('ServiceAccountController', () => {
  let controller: ServiceAccountsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServiceAccountsController],
    }).compile();

    controller = module.get<ServiceAccountsController>(ServiceAccountsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

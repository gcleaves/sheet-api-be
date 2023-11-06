import { Test, TestingModule } from '@nestjs/testing';
import { SheetsController } from './sheet.controller';

describe('SheetController', () => {
  let controller: SheetsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SheetsController],
    }).compile();

    controller = module.get<SheetsController>(SheetsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

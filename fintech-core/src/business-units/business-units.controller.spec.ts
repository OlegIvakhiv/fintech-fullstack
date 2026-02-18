import { Test, TestingModule } from '@nestjs/testing';
import { BusinessUnitsController } from './business-units.controller';
import { BusinessUnitsService } from './business-units.service';

describe('BusinessUnitsController', () => {
  let controller: BusinessUnitsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BusinessUnitsController],
      providers: [BusinessUnitsService],
    }).compile();

    controller = module.get<BusinessUnitsController>(BusinessUnitsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { BusinessUnitsService } from './business-units.service';

describe('BusinessUnitsService', () => {
  let service: BusinessUnitsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BusinessUnitsService],
    }).compile();

    service = module.get<BusinessUnitsService>(BusinessUnitsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

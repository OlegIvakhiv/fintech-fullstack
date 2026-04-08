import { Test, TestingModule } from '@nestjs/testing';
import { WithdrawalRequestsService } from './withdrawal-requests.service';

describe('WithdrawalRequestsService', () => {
  let service: WithdrawalRequestsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WithdrawalRequestsService],
    }).compile();

    service = module.get<WithdrawalRequestsService>(WithdrawalRequestsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { WithdrawalRequestsController } from './withdrawal-requests.controller';
import { WithdrawalRequestsService } from './withdrawal-requests.service';

describe('WithdrawalRequestsController', () => {
  let controller: WithdrawalRequestsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WithdrawalRequestsController],
      providers: [WithdrawalRequestsService],
    }).compile();

    controller = module.get<WithdrawalRequestsController>(WithdrawalRequestsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

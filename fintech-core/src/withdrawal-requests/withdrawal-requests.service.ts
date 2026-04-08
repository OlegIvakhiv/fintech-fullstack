import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma-service/prisma.service';
import { TransactionsService } from '../transactions/transactions.service';
import { CreateWithdrawalRequestDto } from './dto/create-withdrawal-request.dto';
import { RequestAction, UpdateWithdrawalRequestDto } from './dto/update-withdrawal-request.dto';
import { RequestStatus, Currency, WithdrawalType } from '@prisma/client';

@Injectable()
export class WithdrawalRequestsService {
  constructor(
    private prisma: PrismaService,
    private transactionsService: TransactionsService,
  ) { }

  // ✅ UPDATED: Investor creates a withdrawal request
  // Now supports all 3 withdrawal types
  async create(userId: number, dto: CreateWithdrawalRequestDto) {
    if (!userId) {
      throw new BadRequestException('User ID is missing from request');
    }

    // Verify account belongs to user
    const account = await this.prisma.account.findFirst({
      where: { id: dto.accountId, portfolio: { userId } },
    });
    if (!account) throw new NotFoundException('Account not found');

    // Type-specific validation
    switch (dto.withdrawalType) {
      case WithdrawalType.BUSINESS_UNIT_TO_ACCOUNT:
        return this.createBUToAccountWithdrawal(userId, dto, account);

      case WithdrawalType.BUSINESS_UNIT_TO_BUSINESS_UNIT:
        return this.createBUToBUTransfer(userId, dto, account);

      case WithdrawalType.ACCOUNT_TO_EXTERNAL:
        return this.createAccountToExternalWithdrawal(userId, dto, account);

      default:
        throw new BadRequestException('Invalid withdrawal type');
    }
  }

  // Type 1 - Business Unit to Account (existing flow)
  private async createBUToAccountWithdrawal(
    userId: number,
    dto: CreateWithdrawalRequestDto,
    account: any
  ) {
    if (!dto.fromBusinessUnitId) {
      throw new BadRequestException('fromBusinessUnitId is required for BUSINESS_UNIT_TO_ACCOUNT withdrawal');
    }

    // Verify business unit exists and is active
    const businessUnit = await this.prisma.businessUnit.findUnique({
      where: { id: dto.fromBusinessUnitId },
    });
    if (!businessUnit || businessUnit.status !== 'ACTIVE')
      throw new NotFoundException('Business unit not found or inactive');

    // Verify that the user has enough active investment in this business unit
    const investment = await this.prisma.investment.findFirst({
      where: {
        portfolioId: account.portfolioId,
        businessUnitId: dto.fromBusinessUnitId,
        status: 'ACTIVE',
      },
    });
    if (!investment) throw new BadRequestException('No active investment in this business unit');
    if (investment.amount.toNumber() < dto.amount)
      throw new BadRequestException('Requested amount exceeds your invested amount');

    // Create withdrawal request - Type 1
    return this.prisma.withdrawalRequest.create({
      data: {
        investorId: userId,
        accountId: dto.accountId,
        withdrawalType: WithdrawalType.BUSINESS_UNIT_TO_ACCOUNT,
        fromBusinessUnitId: dto.fromBusinessUnitId,
        amount: dto.amount,
        currency: account.currency,
        status: 'PENDING',
        description: dto.description || `Withdrawal from ${businessUnit.name}`,
      },
      include: {
        fromBusinessUnit: true,
        account: true,
      },
    });
  }

  // Type 2 - Business Unit to Business Unit (re-invest)
  private async createBUToBUTransfer(
    userId: number,
    dto: CreateWithdrawalRequestDto,
    account: any
  ) {
    if (!dto.fromBusinessUnitId) {
      throw new BadRequestException('fromBusinessUnitId is required for BUSINESS_UNIT_TO_BUSINESS_UNIT transfer');
    }
    if (!dto.toBusinessUnitId) {
      throw new BadRequestException('toBusinessUnitId is required for BUSINESS_UNIT_TO_BUSINESS_UNIT transfer');
    }
    if (dto.fromBusinessUnitId === dto.toBusinessUnitId) {
      throw new BadRequestException('Source and destination business units must be different');
    }

    // Verify both business units exist and are active
    const fromBU = await this.prisma.businessUnit.findUnique({
      where: { id: dto.fromBusinessUnitId },
    });
    if (!fromBU || fromBU.status !== 'ACTIVE')
      throw new NotFoundException('Source business unit not found or inactive');

    const toBU = await this.prisma.businessUnit.findUnique({
      where: { id: dto.toBusinessUnitId },
    });
    if (!toBU || toBU.status !== 'ACTIVE')
      throw new NotFoundException('Destination business unit not found or inactive');

    // Verify investment in source BU
    const investment = await this.prisma.investment.findFirst({
      where: {
        portfolioId: account.portfolioId,
        businessUnitId: dto.fromBusinessUnitId,
        status: 'ACTIVE',
      },
    });
    if (!investment) throw new BadRequestException('No active investment in source business unit');
    if (investment.amount.toNumber() < dto.amount)
      throw new BadRequestException('Requested amount exceeds your invested amount in source unit');

    // Create withdrawal request - Type 2
    return this.prisma.withdrawalRequest.create({
      data: {
        investorId: userId,
        accountId: dto.accountId,
        withdrawalType: WithdrawalType.BUSINESS_UNIT_TO_BUSINESS_UNIT,
        fromBusinessUnitId: dto.fromBusinessUnitId,
        toBusinessUnitId: dto.toBusinessUnitId,
        amount: dto.amount,
        currency: account.currency,
        status: 'PENDING',
        description: dto.description || `Transfer from ${fromBU.name} to ${toBU.name}`,
      },
      include: {
        fromBusinessUnit: true,
        toBusinessUnit: true,
        account: true,
      },
    });
  }

  // Type 3 - Account to External (cash out)
  private async createAccountToExternalWithdrawal(
    userId: number,
    dto: CreateWithdrawalRequestDto,
    account: any
  ) {
    if (!dto.externalWallet) {
      throw new BadRequestException('externalWallet is required for ACCOUNT_TO_EXTERNAL withdrawal');
    }
    if (!dto.withdrawalMethod) {
      throw new BadRequestException('withdrawalMethod is required for ACCOUNT_TO_EXTERNAL withdrawal');
    }

    // Verify account has sufficient balance
    if (account.balance.toNumber() < dto.amount) {
      throw new BadRequestException('Insufficient funds in account for withdrawal');
    }

    // Create withdrawal request - Type 3
    return this.prisma.withdrawalRequest.create({
      data: {
        investorId: userId,
        accountId: dto.accountId,
        withdrawalType: WithdrawalType.ACCOUNT_TO_EXTERNAL,
        externalWallet: dto.externalWallet,
        withdrawalMethod: dto.withdrawalMethod,
        amount: dto.amount,
        currency: account.currency,
        status: 'PENDING',
        description: dto.description || `Withdrawal to external wallet (${dto.withdrawalMethod})`,
      },
      include: {
        account: true,
      },
    });
  }

  // Investor can view their own requests
  async findMyRequests(userId: number) {
    return this.prisma.withdrawalRequest.findMany({
      where: { investorId: userId },
      include: {
        account: true,
        fromBusinessUnit: true,
        toBusinessUnit: true,
      },
      orderBy: { requestedAt: 'desc' },
    });
  }

  // Admin views all pending requests
  async findPending() {
    return this.prisma.withdrawalRequest.findMany({
      where: { status: 'PENDING' },
      include: {
        investor: { select: { id: true, email: true, name: true } },
        account: true,
        fromBusinessUnit: true,
        toBusinessUnit: true,
      },
      orderBy: { requestedAt: 'asc' },
    });
  }

  // Admin approves a request
  // Routes to appropriate handler based on withdrawal type
  async approve(requestId: number, adminId: number) {
    const request = await this.prisma.withdrawalRequest.findUnique({
      where: { id: requestId },
      include: {
        account: true,
        fromBusinessUnit: true,
        toBusinessUnit: true,
        investor: true,
      },
    });

    if (!request) throw new NotFoundException('Request not found');
    if (request.status !== 'PENDING')
      throw new BadRequestException('Request already processed');

    // Route based on withdrawal type
    switch (request.withdrawalType) {
      case WithdrawalType.BUSINESS_UNIT_TO_ACCOUNT:
        return this.approveBUToAccountWithdrawal(request, adminId);

      case WithdrawalType.BUSINESS_UNIT_TO_BUSINESS_UNIT:
        return this.approveBUToBUTransfer(request, adminId);

      case WithdrawalType.ACCOUNT_TO_EXTERNAL:
        return this.approveAccountToExternalWithdrawal(request, adminId);

      default:
        throw new BadRequestException('Unknown withdrawal type');
    }
  }

  // Approve Type 1 - BU to Account
  private async approveBUToAccountWithdrawal(request: any, adminId: number) {
    return this.prisma.$transaction(async (tx) => {
      // Call divest to move money from BU back to account
      const divestDto = {
        accountId: request.accountId,
        businessUnitId: request.fromBusinessUnitId,
        amount: request.amount.toNumber(),
        description: `Withdrawal request #${request.id} approved by admin`,
      };

      const transactionResult = await this.transactionsService.divest(divestDto);

      // Update request status
      const updatedRequest = await tx.withdrawalRequest.update({
        where: { id: request.id },
        data: {
          status: 'APPROVED',
          processedAt: new Date(),
          adminId,
          transactionId: transactionResult.transactionId,
        },
      });

      return { 
        message: 'Withdrawal from business unit approved and funds returned to account', 
        request: updatedRequest 
      };
    });
  }

  // Approve Type 2 - BU to BU Transfer
  private async approveBUToBUTransfer(request: any, adminId: number) {
    return this.prisma.$transaction(async (tx) => {
      // Step 1: Divest from source BU (returns money to account)
      const divestDto = {
        accountId: request.accountId,
        businessUnitId: request.fromBusinessUnitId,
        amount: request.amount.toNumber(),
        description: `Re-invest transfer from ${request.fromBusinessUnit.name} - Request #${request.id}`,
      };

      const divestResult = await this.transactionsService.divest(divestDto);

      // Step 2: Invest in destination BU (from the same account)
      const investDto = {
        accountId: request.accountId,
        businessUnitId: request.toBusinessUnitId,
        amount: request.amount.toNumber(),
        description: `Re-invest transfer to ${request.toBusinessUnit.name} - Request #${request.id}`,
      };

      const investResult = await this.transactionsService.invest(investDto);

      // Step 3: Update request status
      const updatedRequest = await tx.withdrawalRequest.update({
        where: { id: request.id },
        data: {
          status: 'APPROVED',
          processedAt: new Date(),
          adminId,
          transactionId: divestResult.transactionId, // Reference first transaction
        },
      });

      return {
        message: `Re-investment transfer completed: ${request.fromBusinessUnit.name} → ${request.toBusinessUnit.name}`,
        request: updatedRequest,
        transactions: {
          divest: divestResult.transactionId,
          invest: investResult.transactionId,
        },
      };
    });
  }

  // Approve Type 3 - Account to External
  private async approveAccountToExternalWithdrawal(request: any, adminId: number) {
    return this.prisma.$transaction(async (tx) => {
      // Call withdraw to decrease account balance
      const withdrawDto = {
        accountId: request.accountId,
        amount: request.amount.toNumber(),
        description: `External withdrawal to ${request.withdrawalMethod}: ${request.externalWallet} - Request #${request.id}`,
      };

      const transactionResult = await this.transactionsService.withdraw(withdrawDto);

      // Update request status
      const updatedRequest = await tx.withdrawalRequest.update({
        where: { id: request.id },
        data: {
          status: 'APPROVED',
          processedAt: new Date(),
          adminId,
          transactionId: transactionResult.transactionId,
        },
      });

      return {
        message: `External withdrawal approved to ${request.withdrawalMethod}`,
        wallet: request.externalWallet,
        request: updatedRequest,
      };
    });
  }

  //  Admin rejects a request
  async reject(requestId: number, adminId: number) {
    const request = await this.prisma.withdrawalRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) throw new NotFoundException('Request not found');
    if (request.status !== 'PENDING')
      throw new BadRequestException('Request already processed');

    return this.prisma.withdrawalRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        processedAt: new Date(),
        adminId,
      },
    });
  }
}

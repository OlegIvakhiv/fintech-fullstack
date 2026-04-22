import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma-service/prisma.service';
import { TransactionsService } from '../transactions/transactions.service';
import { CreateWithdrawalRequestDto } from './dto/create-withdrawal-request.dto';
import { UpdateWithdrawalRequestDto } from './dto/update-withdrawal-request.dto';
import { RequestStatus, Currency, WithdrawalType, Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

type PrismaTx = Prisma.TransactionClient;

@Injectable()
export class WithdrawalRequestsService {
  constructor(
    private prisma: PrismaService,
    private transactionsService: TransactionsService,
  ) {}

  // ─── Create ───────────────────────────────────────────────────────────────

  async create(userId: number, dto: CreateWithdrawalRequestDto) {
    if (!userId) throw new BadRequestException('User ID is missing from request');

    const account = await this.prisma.account.findFirst({
      where: { id: dto.accountId, portfolio: { userId } },
    });
    if (!account) throw new NotFoundException('Account not found');

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

  private async createBUToAccountWithdrawal(userId: number, dto: CreateWithdrawalRequestDto, account: any) {
    if (!dto.fromBusinessUnitId) {
      throw new BadRequestException('fromBusinessUnitId is required for BUSINESS_UNIT_TO_ACCOUNT withdrawal');
    }
    const businessUnit = await this.prisma.businessUnit.findUnique({
      where: { id: dto.fromBusinessUnitId },
    });
    if (!businessUnit || businessUnit.status !== 'ACTIVE') {
      throw new NotFoundException('Business unit not found or inactive');
    }
    const investment = await this.prisma.investment.findFirst({
      where: { portfolioId: account.portfolioId, businessUnitId: dto.fromBusinessUnitId, status: 'ACTIVE' },
    });
    if (!investment) throw new BadRequestException('No active investment in this business unit');
    if (investment.amount.toNumber() < dto.amount) {
      throw new BadRequestException('Requested amount exceeds your invested amount');
    }
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
      include: { fromBusinessUnit: true, account: true },
    });
  }

  private async createBUToBUTransfer(userId: number, dto: CreateWithdrawalRequestDto, account: any) {
    if (!dto.fromBusinessUnitId) {
      throw new BadRequestException('fromBusinessUnitId is required');
    }
    if (!dto.toBusinessUnitId) {
      throw new BadRequestException('toBusinessUnitId is required');
    }
    if (dto.fromBusinessUnitId === dto.toBusinessUnitId) {
      throw new BadRequestException('Source and destination business units must be different');
    }
    const [fromBU, toBU] = await Promise.all([
      this.prisma.businessUnit.findUnique({ where: { id: dto.fromBusinessUnitId } }),
      this.prisma.businessUnit.findUnique({ where: { id: dto.toBusinessUnitId } }),
    ]);
    if (!fromBU || fromBU.status !== 'ACTIVE') throw new NotFoundException('Source business unit not found or inactive');
    if (!toBU  || toBU.status  !== 'ACTIVE') throw new NotFoundException('Destination business unit not found or inactive');

    const investment = await this.prisma.investment.findFirst({
      where: { portfolioId: account.portfolioId, businessUnitId: dto.fromBusinessUnitId, status: 'ACTIVE' },
    });
    if (!investment) throw new BadRequestException('No active investment in source business unit');
    if (investment.amount.toNumber() < dto.amount) {
      throw new BadRequestException('Requested amount exceeds your invested amount in source unit');
    }
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
      include: { fromBusinessUnit: true, toBusinessUnit: true, account: true },
    });
  }

  private async createAccountToExternalWithdrawal(userId: number, dto: CreateWithdrawalRequestDto, account: any) {
    if (!dto.externalWallet) {
      throw new BadRequestException('externalWallet is required for ACCOUNT_TO_EXTERNAL withdrawal');
    }
    if (!dto.withdrawalMethod) {
      throw new BadRequestException('withdrawalMethod is required for ACCOUNT_TO_EXTERNAL withdrawal');
    }
    if (account.balance.toNumber() < dto.amount) {
      throw new BadRequestException('Insufficient funds in account for withdrawal');
    }
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
      include: { account: true },
    });
  }

  // ─── Queries ──────────────────────────────────────────────────────────────

  async findMyRequests(userId: number) {
    return this.prisma.withdrawalRequest.findMany({
      where: { investorId: userId },
      include: { account: true, fromBusinessUnit: true, toBusinessUnit: true },
      orderBy: { requestedAt: 'desc' },
    });
  }

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

  // ─── Approve ──────────────────────────────────────────────────────────────

  async approve(requestId: number, adminId: number) {
    const request = await this.prisma.withdrawalRequest.findUnique({
      where: { id: requestId },
      include: { account: true, fromBusinessUnit: true, toBusinessUnit: true, investor: true },
    });
    if (!request) throw new NotFoundException('Request not found');
    if (request.status !== 'PENDING') throw new BadRequestException('Request already processed');

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

  // Type 1 — single $transaction, delegates to _divestTx
  private async approveBUToAccountWithdrawal(request: any, adminId: number) {
    return this.prisma.$transaction(async (tx) => {
      const divestEntry = await this.transactionsService._divestTx(tx, {
        accountId: request.accountId,
        businessUnitId: request.fromBusinessUnitId,
        amount: request.amount.toNumber(),
        description: `Withdrawal request #${request.id} approved by admin`,
      });

      const updatedRequest = await tx.withdrawalRequest.update({
        where: { id: request.id },
        data: {
          status: 'APPROVED',
          processedAt: new Date(),
          adminId,
          transactionId: divestEntry.transactionId,
        },
      });

      return {
        message: 'Withdrawal from business unit approved — funds returned to account',
        request: updatedRequest,
        transactionId: divestEntry.transactionId,
      };
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Type 2 — THE FIX
  //
  // All five mutations (investment decrement, account credit, account debit,
  // investment increment/create, two journal entries) run inside ONE
  // prisma.$transaction. No nested $transaction calls. If any step throws,
  // Postgres rolls back everything.
  // ─────────────────────────────────────────────────────────────────────────
  private async approveBUToBUTransfer(request: any, adminId: number) {
    const divestTxId = uuidv4();
    const investTxId = uuidv4();

    return this.prisma.$transaction(async (tx) => {
      // ── Step 1: Re-validate source investment inside the transaction ──────
      // The investment amount may have changed between the request being
      // created and admin approval. Check again with a row-level read.
      const sourceAccount = await tx.account.findUnique({
        where: { id: request.accountId },
      });
      if (!sourceAccount) throw new NotFoundException('Account not found');

      const sourceInvestment = await tx.investment.findFirst({
        where: {
          portfolioId: sourceAccount.portfolioId,
          businessUnitId: request.fromBusinessUnitId,
          status: 'ACTIVE',
        },
        include: { businessUnit: true },
      });
      if (!sourceInvestment) {
        throw new BadRequestException('Source investment no longer active');
      }
      const amount = request.amount.toNumber();
      if (sourceInvestment.amount.toNumber() < amount) {
        throw new BadRequestException(
          `Investment balance (${sourceInvestment.amount}) is less than requested amount (${amount})`,
        );
      }

      // ── Step 2: Divest from source BU ────────────────────────────────────
      // Decrease investment, credit account, write DIVEST journal entry.
      // We call _divestTx directly — no new $transaction opened.
      const divestEntry = await this.transactionsService._divestTx(tx, {
        accountId: request.accountId,
        businessUnitId: request.fromBusinessUnitId,
        amount,
        description: `Re-invest transfer from ${request.fromBusinessUnit.name} — Request #${request.id}`,
      }, divestTxId);

      // ── Step 3: Invest in destination BU ─────────────────────────────────
      // Decrease account balance, increment/create investment, write INVEST
      // journal entry — all via _investTx, same tx.
      const investEntry = await this.transactionsService._investTx(tx, {
        accountId: request.accountId,
        businessUnitId: request.toBusinessUnitId,
        amount,
        description: `Re-invest transfer to ${request.toBusinessUnit.name} — Request #${request.id}`,
      }, investTxId);

      // ── Step 4: Mark request as approved ─────────────────────────────────
      const updatedRequest = await tx.withdrawalRequest.update({
        where: { id: request.id },
        data: {
          status: 'APPROVED',
          processedAt: new Date(),
          adminId,
          transactionId: divestTxId, // link to the divest leg
        },
      });

      return {
        message: `Re-investment transfer completed: ${request.fromBusinessUnit.name} → ${request.toBusinessUnit.name}`,
        request: updatedRequest,
        transactions: {
          divest: divestTxId,
          invest: investTxId,
        },
      };
    });
  }

  // Type 3 — single $transaction, delegates to _withdrawTx
  // Also re-validates account balance at approval time (balance could have
  // changed between request creation and admin approval).
  private async approveAccountToExternalWithdrawal(request: any, adminId: number) {
    return this.prisma.$transaction(async (tx) => {
      // Re-validate balance at approval time
      const account = await tx.account.findUnique({ where: { id: request.accountId } });
      if (!account) throw new NotFoundException('Account not found');
      if (account.balance.toNumber() < request.amount.toNumber()) {
        throw new BadRequestException(
          `Insufficient funds at approval time. Balance: ${account.balance}, requested: ${request.amount}`,
        );
      }

      const withdrawEntry = await this.transactionsService._withdrawTx(tx, {
        accountId: request.accountId,
        amount: request.amount.toNumber(),
        description: `External withdrawal to ${request.withdrawalMethod}: ${request.externalWallet} — Request #${request.id}`,
      });

      const updatedRequest = await tx.withdrawalRequest.update({
        where: { id: request.id },
        data: {
          status: 'APPROVED',
          processedAt: new Date(),
          adminId,
          transactionId: withdrawEntry.transactionId,
        },
      });

      return {
        message: `External withdrawal approved to ${request.withdrawalMethod}`,
        wallet: request.externalWallet,
        request: updatedRequest,
        transactionId: withdrawEntry.transactionId,
      };
    });
  }

  // ─── Reject ───────────────────────────────────────────────────────────────

  async reject(requestId: number, adminId: number) {
    const request = await this.prisma.withdrawalRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) throw new NotFoundException('Request not found');
    if (request.status !== 'PENDING') throw new BadRequestException('Request already processed');

    return this.prisma.withdrawalRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED', processedAt: new Date(), adminId },
    });
  }
}
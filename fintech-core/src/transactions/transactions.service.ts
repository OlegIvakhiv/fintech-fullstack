import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma-service/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import {
  CreateDepositDto,
  CreateDivestmentDto,
  CreateInvestmentDto,
  CreateTransferDto,
  CreateWithdrawDto,
} from './dto/create-transactions.dto';
import { InvestmentStatus, Prisma, TransactionType } from '@prisma/client';
import { ExchangeService } from 'src/exchenge/exchange.service';
import { SupportedCurrency } from 'src/exchenge/dto/convert-currency.dto';
import Big from 'big.js';

// Shorthand for the Prisma interactive-transaction client type.
// Every *Tx helper accepts this instead of PrismaService so it can be composed
// inside a caller-owned $transaction without opening a nested one.
type PrismaTx = Prisma.TransactionClient;


@Injectable()
export class TransactionsService {
  constructor(
    private prisma: PrismaService,
    private exchangeService: ExchangeService,   // ← inject
  ) {}

  // ─── Public API (each owns exactly one $transaction) ──────────────────────

  async createTransfer(dto: CreateTransferDto) {
    if (dto.fromAccountId === dto.toAccountId) {
      throw new BadRequestException('Source and destination accounts must be different');
    }
    const transactionId = uuidv4();
return this.prisma.$transaction(async (tx) => {
  const sender = await tx.account.findUnique({ where: { id: dto.fromAccountId } });
  if (!sender) throw new NotFoundException('Source account not found');
  if (new Big(sender.balance.toString()).lt(new Big(dto.amount.toString()))) {
    throw new BadRequestException('Insufficient funds in source account');
  }

  await tx.account.update({
    where: { id: dto.fromAccountId },
    data: { balance: { decrement: dto.amount } },
  });
  await tx.account.update({
    where: { id: dto.toAccountId },
    data: { balance: { increment: dto.amount } },
  });
  await tx.journalEntry.createMany({
    data: [
      {
        amount: -dto.amount,
        accountId: dto.fromAccountId,
        transactionId,
        type: 'TRANSFER',
        description: dto.description || `Transfer to account #${dto.toAccountId}`,
      },
      {
        amount: dto.amount,
        accountId: dto.toAccountId,
        transactionId,
        type: 'TRANSFER',
        description: dto.description || `Transfer from account #${dto.fromAccountId}`,
      },
    ],
  });
  return { transactionId, status: 'SUCCESS' };
});
  }

  async deposit(dto: CreateDepositDto) {
    const transactionId = uuidv4();
    return this.prisma.$transaction(async (tx) => {
      const account = await tx.account.update({
        where: { id: dto.accountId },
        data: { balance: { increment: dto.amount } },
      });
      await tx.journalEntry.create({
        data: {
          amount: dto.amount,
          accountId: dto.accountId,
          transactionId,
          type: 'DEPOSIT',
          description: dto.description || 'System Deposit',
        },
      });
      return { transactionId, status: 'SUCCESS', newBalance: account.balance };
    });
  }

  async withdraw(dto: CreateWithdrawDto) {
    const transactionId = uuidv4();
    return this.prisma.$transaction(async (tx) => {
      return this._withdrawTx(tx, dto, transactionId);
    });
  }

  async withdrawToExternal(dto: CreateWithdrawDto) {
    return this.withdraw(dto);
  }

  async divest(dto: CreateDivestmentDto) {
    const transactionId = uuidv4();
    return this.prisma.$transaction(async (tx) => {
      return this._divestTx(tx, dto, transactionId);
    });
  }

  async invest(dto: CreateInvestmentDto) {
    const transactionId = uuidv4();
    return this.prisma.$transaction(async (tx) => {
      return this._investTx(tx, dto, transactionId);
    });
  }

  // ─── Tx-scoped helpers (accept an existing tx client, open NO new $transaction) ─

  // These are intentionally public so WithdrawalRequestsService (and any future
  // service) can compose them inside its own single $transaction.

  async _withdrawTx(tx: PrismaTx, dto: CreateWithdrawDto, transactionId = uuidv4()) {
    const account = await tx.account.findUnique({ where: { id: dto.accountId } });
    if (!account) throw new NotFoundException('Account not found');
    if (Number(account.balance) < dto.amount) {
      throw new BadRequestException('Insufficient funds for withdrawal');
    }
    const updatedAccount = await tx.account.update({
      where: { id: dto.accountId },
      data: { balance: { decrement: dto.amount } },
    });
    await tx.journalEntry.create({
      data: {
        amount: -dto.amount,
        accountId: dto.accountId,
        transactionId,
        type: 'WITHDRAW',
        description: dto.description || 'External funds withdrawal',
      },
    });
    return {
      transactionId,
      newBalance: updatedAccount.balance,
      status: 'SUCCESS',
      description: 'Funds withdrawn from account to external wallet',
    };
  }

  async _divestTx(tx: PrismaTx, dto: CreateDivestmentDto, transactionId = uuidv4()) {
    const account = await tx.account.findUnique({ where: { id: dto.accountId } });
    if (!account) throw new NotFoundException('Account not found for divestment');

    const investment = await tx.investment.findFirst({
      where: {
        portfolioId: account.portfolioId,
        businessUnitId: dto.businessUnitId,
        status: InvestmentStatus.ACTIVE,
      },
      include: { businessUnit: true },
    });
    if (!investment) throw new BadRequestException('No active investment in this business unit');
    if (Number(investment.amount) < dto.amount) {
      throw new BadRequestException('Withdrawal amount exceeds invested amount');
    }

    const newAmount = Number(investment.amount) - dto.amount;
    await tx.investment.update({
      where: { id: investment.id },
      data: {
        amount: { decrement: dto.amount },
        status: newAmount <= 0 ? InvestmentStatus.WITHDRAWN : InvestmentStatus.ACTIVE,
      },
    });

    await tx.account.update({
      where: { id: dto.accountId },
      data: { balance: { increment: dto.amount } },
    });

    return tx.journalEntry.create({
      data: {
        amount: dto.amount,
        accountId: dto.accountId,
        businessUnitId: dto.businessUnitId,
        investmentId: investment.id,
        transactionId,
        type: TransactionType.DIVEST,
        description: dto.description || `Withdrawal from investment in ${investment.businessUnit.name}`,
      },
    });
  }

  async _investTx(tx: PrismaTx, dto: CreateInvestmentDto, transactionId = uuidv4()) {
    const account = await tx.account.findUnique({
      where: { id: dto.accountId },
      include: { portfolio: true },
    });
    if (!account) throw new NotFoundException('Account not found');
    if (Number(account.balance) < dto.amount) {
      throw new BadRequestException('Insufficient funds in account');
    }

    await tx.account.update({
      where: { id: dto.accountId },
      data: { balance: { decrement: dto.amount } },
    });

    const bu = await tx.businessUnit.findUnique({ where: { id: dto.businessUnitId } });
    if (!bu) throw new NotFoundException('Business unit not found');

    let investment = await tx.investment.findFirst({
      where: {
        portfolioId: account.portfolioId,
        businessUnitId: dto.businessUnitId,
        status: InvestmentStatus.ACTIVE,
      },
    });

    if (investment) {
      investment = await tx.investment.update({
        where: { id: investment.id },
        data: { amount: { increment: dto.amount } },
      });
    } else {
      investment = await tx.investment.create({
        data: {
          portfolioId: account.portfolioId,
          businessUnitId: dto.businessUnitId,
          amount: dto.amount,
          currency: bu.currency,
          status: InvestmentStatus.ACTIVE,
        },
      });
    }

    return tx.journalEntry.create({
      data: {
        amount: dto.amount,
        accountId: dto.accountId,
        businessUnitId: dto.businessUnitId,
        investmentId: investment.id,
        transactionId,
        type: TransactionType.INVEST,
        description: dto.description || `Investment in ${bu.name}`,
      },
    });
  }

// ─── NEW: Cross‑currency transfer between user's own accounts ─────────────
  async createCrossCurrencyTransfer(
    userId: number,
    fromAccountId: number,
    toAccountId: number,
    amount: number,
  ) {
    // 1. Fetch both accounts and verify ownership
    const fromAccount = await this.prisma.account.findFirst({
      where: { id: fromAccountId, portfolio: { userId } },
    });
    const toAccount = await this.prisma.account.findFirst({
      where: { id: toAccountId, portfolio: { userId } },
    });
    if (!fromAccount || !toAccount) {
      throw new BadRequestException('Account not found or does not belong to you');
    }
    if (fromAccount.id === toAccount.id) {
      throw new BadRequestException('Source and destination accounts must be different');
    }
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }
    // If same currency, fallback to regular transfer
    if (fromAccount.currency === toAccount.currency) {
      return this.createTransfer({
        fromAccountId,
        toAccountId,
        amount,
        description: `Transfer between same-currency accounts`,
      });
    }

    // 2. Convert amount using ExchangeService
    const conversion = await this.exchangeService.convert(
      amount,
      fromAccount.currency as SupportedCurrency,
      toAccount.currency as SupportedCurrency,
    );
    const netAmount = conversion.converted.amount;
    const fee = conversion.fee.amount;

    // 3. Execute transfer inside a transaction
    const transactionId = uuidv4();
    return this.prisma.$transaction(async (tx) => {
      // Debit source account
      const updatedFrom = await tx.account.update({
        where: { id: fromAccountId },
        data: { balance: { decrement: amount } },
      });
      if (updatedFrom.balance.toNumber() < 0) {
        throw new BadRequestException('Insufficient funds in source account');
      }
      // Credit destination account
      await tx.account.update({
        where: { id: toAccountId },
        data: { balance: { increment: netAmount } },
      });
      // Create journal entries
      await tx.journalEntry.createMany({
        data: [
          {
            amount: -amount,
            accountId: fromAccountId,
            transactionId,
            type: 'TRANSFER',
            description: `Cross-currency transfer to ${toAccount.name} (${toAccount.currency}) – rate: 1 ${fromAccount.currency} = ${conversion.effectiveRate} ${toAccount.currency} (incl. ${conversion.feePercent}% fee)`,
          },
          {
            amount: netAmount,
            accountId: toAccountId,
            transactionId,
            type: 'TRANSFER',
            description: `Cross-currency transfer from ${fromAccount.name} (${fromAccount.currency}) – amount after conversion: ${netAmount} ${toAccount.currency}`,
          },
        ],
      });
      return {
        transactionId,
        fromAmount: amount,
        fromCurrency: fromAccount.currency,
        toAmount: netAmount,
        toCurrency: toAccount.currency,
        fee,
        effectiveRate: conversion.effectiveRate,
      };
    });
  }
  // ─── Queries (no transactions needed) ─────────────────────────────────────

  async findAll() {
    return this.prisma.journalEntry.findMany({
      include: {
        account: { include: { portfolio: { include: { user: true } } } },
        businessUnit: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByType(type: string) {
    return this.prisma.journalEntry.findMany({
      where: { type: type as TransactionType },
      include: { account: true, businessUnit: true },
    });
  }

  async getAccountHistory(accountId: number) {
    return this.prisma.journalEntry.findMany({
      where: { accountId },
      include: { businessUnit: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }


async findByUserId(userId: number) {
  // 1. Get all portfolios owned by this user
  const portfolios = await this.prisma.portfolio.findMany({
    where: { userId },
    select: { id: true },
  });
  const portfolioIds = portfolios.map(p => p.id);
  if (portfolioIds.length === 0) return [];

  // 2. Get all accounts under those portfolios
  const accounts = await this.prisma.account.findMany({
    where: { portfolioId: { in: portfolioIds } },
    select: { id: true },
  });
  const accountIds = accounts.map(a => a.id);
  if (accountIds.length === 0) return [];

  // 3. Fetch journal entries for those accounts
  return this.prisma.journalEntry.findMany({
    where: { accountId: { in: accountIds } },
    include: {
      account: {
        include: {
          portfolio: {
            include: { user: true },
          },
        },
      },
      businessUnit: true,
      investment: {
        include: { businessUnit: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}



}
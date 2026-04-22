import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma-service/prisma.service';
import { TransactionsService } from 'src/transactions/transactions.service';
import { CreateFundDto } from './dto/create-fund.dto';
import { InvestInFundDto } from './dto/invest-in-fund.dto';
import { v4 as uuidv4 } from 'uuid';
import { Prisma } from '@prisma/client';

type PrismaTx = Prisma.TransactionClient;

@Injectable()
export class FundsService {
  constructor(
    private prisma: PrismaService,
    private transactionsService: TransactionsService,
  ) {}

  // ── Admin: create a fund with weighted BU allocations ─────────────────────

  async create(dto: CreateFundDto) {
  // Use ?? [] to ensure it's at least an empty array before reducing
  const allocations = dto.allocations ?? []; 
  const totalWeight = allocations.reduce((s, a) => s + a.weight, 0);
  
  if (allocations.length === 0) {
    throw new BadRequestException('At least one allocation is required');
  }

  if (Math.abs(totalWeight - 100) > 0.01) {
    throw new BadRequestException('Allocation weights must sum to 100%');
  }

  return this.prisma.fund.create({
    data: {
      name: dto.name,
      description: dto.description,
      currency: dto.currency,
      allocations: {
        create: allocations.map((a) => ({ // Use the safe variable
          businessUnitId: a.businessUnitId,
          weight: a.weight,
        })),
      },
    },
    include: { allocations: { include: { businessUnit: true } } },
  });
}

  // ── List all active funds with allocations + live ROI summary ─────────────

  async findAll() {
    const funds = await this.prisma.fund.findMany({
      where: { status: 'ACTIVE' },
      include: {
        allocations: {
          include: {
            businessUnit: {
              select: {
                id: true,
                name: true,
                currency: true,
                monthlyROI: true,
                annualROI: true,
                interestRate: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return funds.map((fund) => ({
      ...fund,
      ...this._computeFundROI(fund.allocations),
    }));
  }

  // ── Single fund detail ─────────────────────────────────────────────────────

  async findOne(id: number) {
    const fund = await this.prisma.fund.findUnique({
      where: { id },
      include: {
        allocations: {
          include: {
            businessUnit: {
              include: {
                roiHistory: { orderBy: { createdAt: 'desc' }, take: 12 },
              },
            },
          },
        },
        investments: {
          where: { status: 'ACTIVE' },
          select: { amount: true, account: { select: { portfolio: { select: { userId: true } } } } },
        },
      },
    });
    if (!fund) throw new NotFoundException('Fund not found');

    const totalPoolValue = fund.investments.reduce((s, i) => s + i.amount, 0);
    const uniqueInvestors = new Set(
      fund.investments.map((i) => i.account.portfolio.userId),
    ).size;

    return {
      ...fund,
      totalPoolValue,
      investorCount: uniqueInvestors,
      ...this._computeFundROI(fund.allocations),
    };
  }

  // ── Investor: invest in a fund — auto-distributes across BUs ──────────────

  async investInFund(dto: InvestInFundDto, userId: number) {
    const fund = await this.prisma.fund.findUnique({
      where: { id: dto.fundId },
      include: { allocations: true },
    });
    if (!fund) throw new NotFoundException('Fund not found');
    if (fund.status !== 'ACTIVE') {
      throw new BadRequestException('Fund is not active');
    }
    if (dto.amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    // Verify account ownership
    const account = await this.prisma.account.findFirst({
      where: { id: dto.accountId, portfolio: { userId } },
    });
    if (!account) {
      throw new BadRequestException('Account not found or does not belong to you');
    }
    if (Number(account.balance) < dto.amount) {
      throw new BadRequestException('Insufficient funds');
    }

    const transactionId = uuidv4();

    return this.prisma.$transaction(async (tx) => {
      // 1. Debit the account once
      const updated = await tx.account.update({
        where: { id: dto.accountId },
        data: { balance: { decrement: dto.amount } },
      });
      if (updated.balance.toNumber() < 0) {
        throw new BadRequestException('Insufficient funds');
      }

      // 2. Record the fund-level investment
      await tx.fundInvestment.create({
        data: {
          fundId: dto.fundId,
          accountId: dto.accountId,
          amount: dto.amount,
        },
      });

      // 3. Auto-distribute into each BU via existing _investTx helper
      const allocResults: { buId: number; amount: number }[] = [];
      for (const alloc of fund.allocations) {
        const slice = parseFloat(
          ((dto.amount * alloc.weight) / 100).toFixed(2),
        );
        if (slice <= 0) continue;

        await this.transactionsService._investTx(
          tx,
          {
            accountId: dto.accountId,
            businessUnitId: alloc.businessUnitId,
            amount: slice,
            description: `Fund "${fund.name}" auto-allocation (${alloc.weight}%)`,
          },
          transactionId + `-bu${alloc.businessUnitId}`,
        );
        allocResults.push({ buId: alloc.businessUnitId, amount: slice });
      }

      // 4. Journal entry for the fund-level debit (summary line)
      await tx.journalEntry.create({
        data: {
          amount: -dto.amount,
          accountId: dto.accountId,
          transactionId,
          type: 'INVEST',
          description: `Fund investment: ${fund.name} — ${fund.allocations.length} BUs`,
        },
      });

      return {
        transactionId,
        fundId: dto.fundId,
        totalInvested: dto.amount,
        allocations: allocResults,
        status: 'SUCCESS',
      };
    });
  }

  // ── Weighted ROI helper ────────────────────────────────────────────────────

  private _computeFundROI(
    allocations: { weight: number; businessUnit: { monthlyROI?: number | null; annualROI?: number | null } }[],
  ) {
    let weightedMonthly = 0;
    let weightedAnnual = 0;
    let coveredWeight = 0;

    for (const alloc of allocations) {
      if (alloc.businessUnit.monthlyROI != null) {
        weightedMonthly += (alloc.weight / 100) * alloc.businessUnit.monthlyROI;
        weightedAnnual += (alloc.weight / 100) * (alloc.businessUnit.annualROI ?? 0);
        coveredWeight += alloc.weight;
      }
    }

    return {
      weightedMonthlyROI: coveredWeight > 0 ? parseFloat(weightedMonthly.toFixed(4)) : null,
      weightedAnnualROI: coveredWeight > 0 ? parseFloat(weightedAnnual.toFixed(4)) : null,
    };
  }

  // ── Update fund (admin) ────────────────────────────────────────────────────

  async update(id: number, data: Partial<CreateFundDto>) {
    if (data.allocations) {
      const total = data.allocations.reduce((s, a) => s + a.weight, 0);
      if (Math.abs(total - 100) > 0.01) {
        throw new BadRequestException('Allocation weights must sum to 100%');
      }
      // Replace all allocations atomically
      await this.prisma.$transaction([
        this.prisma.fundAllocation.deleteMany({ where: { fundId: id } }),
        ...data.allocations.map((a) =>
          this.prisma.fundAllocation.create({
            data: { fundId: id, businessUnitId: a.businessUnitId, weight: a.weight },
          }),
        ),
      ]);
    }

    return this.prisma.fund.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
      },
      include: { allocations: { include: { businessUnit: true } } },
    });
  }

  async remove(id: number) {
    return this.prisma.fund.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });
  }
}
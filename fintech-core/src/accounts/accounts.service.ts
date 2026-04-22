import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma-service/prisma.service';
import { CreateAccountDto } from './dto/create-accounts.dto';
import { Currency } from '@prisma/client';
import Big from 'big.js';

Big.RM = Big.roundHalfEven;
Big.DP = 8;

@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService) { }

 // ✅ FIXED: Ensure currency is properly stored
  async create(data: CreateAccountDto) {
    return this.prisma.account.create({
      data: {
        name: data.name,
        type: data.type,
        balance: data.initialBalance || 0,
        // ✅ Explicitly cast currency to Prisma Currency enum
        currency: data.currency as Currency,
        portfolio: { connect: { id: data.portfolioId } }
      },
    });
  }

  // ✅ FIXED: Include portfolio and user data for investors
async findByUser(userId: number) {
  const portfolios = await this.prisma.portfolio.findMany({
    where: { userId },
    select: { id: true },
  });
  return this.prisma.account.findMany({
    where: {
      portfolioId: { in: portfolios.map(p => p.id) },
      deletedAt: null,
    },
    include: {
      portfolio: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      journalEntries: { take: 5, orderBy: { createdAt: 'desc' } },
    },
  });
}


  // ✅ FIXED: Include portfolio and user data for admins
async findAll() {
  return this.prisma.account.findMany({
    where: { deletedAt: null },
    include: {
      portfolio: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      journalEntries: { take: 5, orderBy: { createdAt: 'desc' } },
    },
  });
}

  // get details of a specific account by its ID, including the latest 5 journal entries.
  async findOne(id: number) {
    return this.prisma.account.findUnique({
      where: { id },
      include: { 
        portfolio: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        journalEntries: { take: 5, orderBy: { createdAt: 'desc' } } 
      }
    });
  }

  async countByUser(userId: number): Promise<number> {
  const portfolios = await this.prisma.portfolio.findMany({
    where: { userId },
    select: { id: true },
  });
  return this.prisma.account.count({
    where: { portfolioId: { in: portfolios.map(p => p.id) } },
  });
}

  // get all accounts that belong to a specific portfolio. 
  // The portfolio ID is provided as a URL parameter.
  async findByPortfolio(portfolioId: number) {
    return this.prisma.account.findMany({
      where: { portfolioId },
      include: { 
        portfolio: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        journalEntries: { take: 5, orderBy: { createdAt: 'desc' } } 
      }
    });
  }

  // remove an account by its ID. 
async remove(id: number) {
  const account = await this.prisma.account.findUnique({
    where: { id },
    include: { journalEntries: { take: 1 } },
  });
  if (!account) throw new NotFoundException('Account not found');

  const balance = account.balance.toNumber();
  const hasJournal = account.journalEntries.length > 0;
  const ageMs = Date.now() - new Date(account.createdAt).getTime();
  const isNew = ageMs < 24 * 60 * 60 * 1000;

  // Hard delete: only if balance=0, no journal entries, created <24h ago
  if (balance === 0 && !hasJournal && isNew) {
    return this.prisma.account.delete({ where: { id } });
  }

  // Balance > 0: block entirely
  if (balance > 0) {
    throw new BadRequestException(
      'Cannot delete account with positive balance. Please withdraw or transfer funds first.',
    );
  }

  // Has journal entries or old account: soft delete
  return this.prisma.account.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

  // update an account's information based on its ID. 
async update(accountId: number, data: Partial<CreateAccountDto>) {
  const account = await this.prisma.account.findUnique({ where: { id: accountId } });
  if (!account) throw new NotFoundException('Account not found');

  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.type !== undefined) updateData.type = data.type;

  if (data.currency !== undefined && data.currency !== account.currency) {
    // Fetch live exchange rates to convert balance
    const fromCurrency = account.currency as string;
    const toCurrency = data.currency as string;
    const currentBalance = account.balance.toNumber();

if (currentBalance > 0) {
  const rates = await this.getUAHRates();
  const fromRate = rates[fromCurrency];
  const toRate = rates[toCurrency];

  if (!fromRate || !toRate) {
    throw new BadRequestException(`Cannot convert between ${fromCurrency} and ${toCurrency}: rates unavailable`);
  }

  const convertedBalance = new Big(currentBalance.toString())
    .times(new Big(fromRate.toString()))
    .div(new Big(toRate.toString()));

  updateData.balance = convertedBalance.round(8).toString();

  await this.prisma.journalEntry.create({
    data: {
      accountId,
      type: 'CURRENCY_CONVERSION' as any,
      amount: convertedBalance.round(8).toString(),
      description: `Currency changed from ${fromCurrency} to ${toCurrency}. Balance converted: ${currentBalance} ${fromCurrency} → ${convertedBalance.round(8).toFixed(8)} ${toCurrency}`,
    },
  });
}

    updateData.currency = data.currency as Currency;
  }

  return this.prisma.account.update({
    where: { id: accountId },
    data: updateData,
  });
}

// Fetch UAH-based rates from NBU API
private async getUAHRates(): Promise<Record<string, number>> {
  try {
    const res = await fetch('https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json');
    const data: { cc: string; rate: number }[] = await res.json();
    const rates: Record<string, number> = { UAH: 1 };
    for (const item of data) {
      rates[item.cc] = item.rate;
    }
    return rates;
  } catch {
    throw new BadRequestException('Failed to fetch exchange rates from NBU');
  }
}

}
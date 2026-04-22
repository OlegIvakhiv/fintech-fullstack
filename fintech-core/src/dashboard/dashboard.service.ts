import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma-service/prisma.service';
import Big from 'big.js';

Big.RM = Big.roundHalfEven;
Big.DP = 8;

export interface InvestorDashboardStats {
  totalRevenue: number;
  totalSaving: number;
  taxesPaid: number;
  availableBalance: number;
  pendingWithdrawals: number;
}

export interface AdminDashboardStats {
  totalUsers: number;
  totalInvested: number;
  pendingWithdrawals: number;
  activeBusinessUnits: number;
  totalTransactions: number;
  totalAccounts: number;
  systemBalance: number;
}

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getInvestorStats(userId: number): Promise<InvestorDashboardStats> {
    try {
      const portfolio = await this.prisma.portfolio.findFirst({
        where: { userId },
        include: {
          accounts: true,
          investments: {
            where: { status: 'ACTIVE' },
            include: { businessUnit: true },
          },
        },
      });

      if (!portfolio) {
        return { totalRevenue: 0, totalSaving: 0, taxesPaid: 0, availableBalance: 0, pendingWithdrawals: 0 };
      }

      const availableBalance = portfolio.accounts
        .reduce((sum, acc) => sum.plus(new Big(acc.balance.toString())), new Big(0))
        .round(8)
        .toNumber();

      let totalRevenue = new Big(0);
      for (const investment of portfolio.investments) {
        if (investment.businessUnit) {
          const earned = new Big(investment.amount.toString())
            .times(new Big(investment.businessUnit.monthlyROI?.toString() ?? '0'))
            .div(100);
          totalRevenue = totalRevenue.plus(earned);
        }
      }

      const totalSaving = portfolio.investments
        .reduce((sum, inv) => sum.plus(new Big(inv.amount.toString())), new Big(0))
        .round(8)
        .toNumber();

      const taxesPaid = totalRevenue.times('0.1').round(8).toNumber();

      const pendingWithdrawals = await this.prisma.withdrawalRequest.count({
        where: { investorId: userId, status: 'PENDING' },
      });

      return {
        totalRevenue: totalRevenue.round(8).toNumber(),
        totalSaving,
        taxesPaid,
        availableBalance,
        pendingWithdrawals,
      };
    } catch (error) {
      console.error('Error getting investor stats:', error);
      return { totalRevenue: 0, totalSaving: 0, taxesPaid: 0, availableBalance: 0, pendingWithdrawals: 0 };
    }
  }

  async getAdminStats(): Promise<AdminDashboardStats> {
    try {
      const [
        totalUsers, totalAccounts, activeBusinessUnits,
        totalTransactions, pendingWithdrawals, investments, businessUnits,
      ] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.account.count(),
        this.prisma.businessUnit.count({ where: { status: 'ACTIVE' } }),
        this.prisma.journalEntry.count(),
        this.prisma.withdrawalRequest.count({ where: { status: 'PENDING' } }),
        this.prisma.investment.findMany({ where: { status: 'ACTIVE' } }),
        this.prisma.businessUnit.findMany(),
      ]);

      const totalInvested = investments
        .reduce((sum, inv) => sum.plus(new Big(inv.amount.toString())), new Big(0))
        .round(8)
        .toNumber();

      const systemBalance = businessUnits
        .reduce((sum, bu) => sum.plus(new Big(bu.balance.toString())), new Big(0))
        .round(8)
        .toNumber();

      return {
        totalUsers, totalInvested, pendingWithdrawals,
        activeBusinessUnits, totalTransactions, totalAccounts, systemBalance,
      };
    } catch (error) {
      console.error('Error getting admin stats:', error);
      return {
        totalUsers: 0, totalInvested: 0, pendingWithdrawals: 0,
        activeBusinessUnits: 0, totalTransactions: 0, totalAccounts: 0, systemBalance: 0,
      };
    }
  }

  async getInvestorMonthlyEarnings(userId: number) {
    const portfolio = await this.prisma.portfolio.findFirst({
      where: { userId },
      include: {
        investments: {
          where: { status: 'ACTIVE' },
          include: {
            businessUnit: { include: { roiHistory: true } },
          },
        },
      },
    });

    if (!portfolio || portfolio.investments.length === 0) return [];

    const earningsByMonth = new Map<string, Big>();

    for (const investment of portfolio.investments) {
      const investedAmount = new Big(investment.amount.toString());

      for (const roi of investment.businessUnit.roiHistory) {
        const totalPool = new Big(roi.totalPoolValue.toString());
        if (totalPool.eq(0)) continue;

        const investorShare = investedAmount
          .div(totalPool)
          .times(new Big(roi.totalDistributed.toString()));

        const monthKey = `${roi.year}-${roi.month.toString().padStart(2, '0')}`;
        earningsByMonth.set(
          monthKey,
          (earningsByMonth.get(monthKey) ?? new Big(0)).plus(investorShare),
        );
      }
    }

    return Array.from(earningsByMonth.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, earnings]) => {
        const [year, month] = key.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return {
          month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          earnings: earnings.round(8).toNumber(),
        };
      });
  }
}
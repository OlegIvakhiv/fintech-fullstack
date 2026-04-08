import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma-service/prisma.service';

// Interface for investor dashboard stats
export interface InvestorDashboardStats {
  totalRevenue: number;
  totalSaving: number;
  taxesPaid: number;
  availableBalance: number;
  pendingWithdrawals: number;
}
// Interface for admin dashboard stats
export interface AdminDashboardStats {
  totalUsers: number;
  totalInvested: number;
  pendingWithdrawals: number;
  activeBusinessUnits: number;
  totalTransactions: number;
  totalAccounts: number;
  systemBalance: number;
}

// Service for getting dashboard stats
@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  // Get investor dashboard stats
  async getInvestorStats(userId: number): Promise<InvestorDashboardStats> {
    try {
      // Get user's portfolio with accounts and investments
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
        return {
          totalRevenue: 0,
          totalSaving: 0,
          taxesPaid: 0,
          availableBalance: 0,
          pendingWithdrawals: 0,
        };
      }

      // Available Balance = Sum of all account balances
      const availableBalance = portfolio.accounts.reduce((sum, account) => {
        return sum + parseFloat(account.balance.toString());
      }, 0);

      // Total Revenue = Sum of earned interest from active investments
      // Revenue = investment.amount * businessUnit.interestRate / 100
      let totalRevenue = 0;
      for (const investment of portfolio.investments) {
        if (investment.businessUnit) {
          const earned =
            parseFloat(investment.amount.toString()) *
            (investment.businessUnit.interestRate / 100);
          totalRevenue += earned;
        }
      }

      // Total Saving = Sum of all active investments (money currently invested)
      const totalSaving = portfolio.investments.reduce((sum, investment) => {
        return sum + parseFloat(investment.amount.toString());
      }, 0);

      // Taxes to be paid = 10% of total revenue (simplified calculation)
      const taxesPaid = totalRevenue * 0.1;

      // Pending Withdrawals = Count of PENDING withdrawal requests for this user
      const pendingWithdrawals =
        await this.prisma.withdrawalRequest.count({
          where: {
            investorId: userId,
            status: 'PENDING',
          },
        });

      return {
        totalRevenue,
        totalSaving,
        taxesPaid,
        availableBalance,
        pendingWithdrawals,
      };
    } catch (error) {
      console.error('Error getting investor stats:', error);
      return {
        totalRevenue: 0,
        totalSaving: 0,
        taxesPaid: 0,
        availableBalance: 0,
        pendingWithdrawals: 0,
      };
    }
  }

  // Get admin dashboard stats
  async getAdminStats(): Promise<AdminDashboardStats> {
    try {
      // Total Users = Count of all users
      const totalUsers = await this.prisma.user.count();

      // Total Accounts = Count of all accounts
      const totalAccounts = await this.prisma.account.count();

      // Active Business Units = Count of ACTIVE business units
      const activeBusinessUnits =
        await this.prisma.businessUnit.count({
          where: { status: 'ACTIVE' },
        });

      // Total Transactions = Count of all journal entries
      const totalTransactions = await this.prisma.journalEntry.count();

      // Pending Withdrawals = Count of PENDING withdrawal requests
      const pendingWithdrawals =
        await this.prisma.withdrawalRequest.count({
          where: { status: 'PENDING' },
        });

      // Total Invested = Sum of all ACTIVE investments
      const investments = await this.prisma.investment.findMany({
        where: { status: 'ACTIVE' },
      });

      const totalInvested = investments.reduce((sum, investment) => {
        return sum + parseFloat(investment.amount.toString());
      }, 0);

      // System Balance = Sum of all business unit balances
      const businessUnits = await this.prisma.businessUnit.findMany();

      const systemBalance = businessUnits.reduce((sum, bu) => {
        return sum + parseFloat(bu.balance.toString());
      }, 0);

      return {
        totalUsers,
        totalInvested,
        pendingWithdrawals,
        activeBusinessUnits,
        totalTransactions,
        totalAccounts,
        systemBalance,
      };
    } catch (error) {
      console.error('Error getting admin stats:', error);
      return {
        totalUsers: 0,
        totalInvested: 0,
        pendingWithdrawals: 0,
        activeBusinessUnits: 0,
        totalTransactions: 0,
        totalAccounts: 0,
        systemBalance: 0,
      };
    }
  }
}
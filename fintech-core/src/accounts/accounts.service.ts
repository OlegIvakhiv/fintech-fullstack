import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma-service/prisma.service';
import { CreateAccountDto } from './dto/create-accounts.dto';
import { Currency } from '@prisma/client';

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
    // Get all portfolio IDs for this user
    const portfolios = await this.prisma.portfolio.findMany({
      where: { userId },
      select: { id: true },
    });
    const portfolioIds = portfolios.map(p => p.id);
    if (portfolioIds.length === 0) return [];

    return this.prisma.account.findMany({
      where: { portfolioId: { in: portfolioIds } },
      include: { 
        portfolio: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        journalEntries: { take: 5, orderBy: { createdAt: 'desc' } } 
      },
    });
  }


  // ✅ FIXED: Include portfolio and user data for admins
  async findAll() {
    return this.prisma.account.findMany({
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
    return this.prisma.account.delete({ where: { id } });
  }

  // update an account's information based on its ID. 
  async update(accountId: number, data: CreateAccountDto) {
    return this.prisma.account.update({
      where: { id: accountId },
      data: {
        name: data.name,
        type: data.type,
        currency: data.currency as Currency,
      },
    });
  }

}
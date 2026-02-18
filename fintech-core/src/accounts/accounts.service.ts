import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma-service/prisma.service';

@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService) {}

  // create a new account with specified name, type, portfolio ID, 
  // and optional initial balance.
  async create(data: { name: string; type: string; portfolioId: number; initialBalance?: number }) {
    return this.prisma.account.create({
      data: {
        name: data.name,
        type: data.type,
        balance: data.initialBalance || 0, 
        Portfolio: { connect: { id: data.portfolioId } }
      },
    });
  }

  // get all accounts that belong to a specific portfolio. 
  // The portfolio ID is provided as a URL parameter.
  async findByPortfolio(portfolioId: number) {
    return this.prisma.account.findMany({
      where: { portfolioId },
      include: { journalEntries: { take: 5, orderBy: { createdAt: 'desc' } } } 
    });
  }

async update(accountId: number, data: { name?: string; type?: string }) {
    return this.prisma.account.update({
        where: { id: accountId },
        data,
    });
}

}

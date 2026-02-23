import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma-service/prisma.service';
import { CreateAccountDto } from './dto/create-accounts.dto';

@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService) { }

  // create a new account with specified name, type, portfolio ID, 
  // and optional initial balance.
  async create(data: CreateAccountDto) {
    return this.prisma.account.create({
      data: {
        name: data.name,
        type: data.type,
        balance: data.initialBalance || 0,
        portfolio: { connect: { id: data.portfolioId } }
      },
    });
  }

  // get a list of all accounts in the system, including their latest 5 journal entries.
  async findAll() {
    return this.prisma.account.findMany({
      include: { journalEntries: { take: 5, orderBy: { createdAt: 'desc' } } }
    });
  }

  // get details of a specific account by its ID, including the latest 5 journal entries.
  async findOne(id: number) {
    return this.prisma.account.findUnique({
      where: { id },
      include: { journalEntries: { take: 5, orderBy: { createdAt: 'desc' } } }
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

  // remove an account by its ID. 
  async remove(id: number) {
    return this.prisma.account.delete({ where: { id } });
  }

  // update an account's information based on its ID. 
  async update(accountId: number, data: CreateAccountDto) {
    return this.prisma.account.update({
      where: { id: accountId },
      data,
    });
  }

}

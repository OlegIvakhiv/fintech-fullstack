import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma-service/prisma.service';

// servce for managing portfolios - create, list, etc.
@Injectable()
export class PortfoliosService {
  constructor(private prisma: PrismaService) {}

  // create a new portfolio for a user
  async create(data: { name: string; userId: number }) {
    return this.prisma.portfolio.create({
      data: {
        name: data.name,
        userId: data.userId,
      },
    });
  }

// list all portfolios with their accounts
  async findAll() {
    return this.prisma.portfolio.findMany({
      include: { accounts: true }, 
    });
  }
}
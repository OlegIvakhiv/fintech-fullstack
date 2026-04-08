import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma-service/prisma.service';
import { CreatePortfolioDto } from './dto/create-portfolios.dto';
import { Prisma } from '@prisma/client';

// servce for managing portfolios - create, list, etc.
@Injectable()
export class PortfoliosService {
  constructor(private prisma: PrismaService) { }

  // create a new portfolio with specified name and user ID. 
  // The request body should contain these details.
  async create(data: CreatePortfolioDto) {
    return this.prisma.portfolio.create({
      data: {
        name: data.name,
        user: { connect: { id: data.userId } } // Explicitly connect to the User
      },
    });
  }

  // get all portfolios in the system, including their associated accounts and user information.
  async findAll() {
    return this.prisma.portfolio.findMany({
      include: {
        accounts: true,
        user: { select: { email: true, name: true } }
      },
    });
  }

  // retrieve details of a specific portfolio by its ID.
  async findOne(id: number) {
    return this.prisma.portfolio.findUnique({
      where: { id },
    });
  }

  async findByUser(userId: number) {
    // Fetch portfolios with required relations
    const portfolios = await this.prisma.portfolio.findMany({
      where: { userId },
      include: {
        accounts: true,   // wallets
        investments: {
          include: {
            businessUnit: true,  // get business unit details
          },
        },
      },
    });

    // Create a type that matches the returned structure
    type PortfolioWithRelations = Prisma.PortfolioGetPayload<{
      include: { accounts: true; investments: { include: { businessUnit: true } } }
    }>;

    // Now TypeScript knows the exact shape
    const enrichedPortfolios = (portfolios as PortfolioWithRelations[]).map(portfolio => {
      // Convert Decimal to number using .toNumber()
      const totalInvested = portfolio.investments.reduce(
        (sum, inv) => sum + inv.amount.toNumber(),
        0
      );
      const activeInvestments = portfolio.investments.filter(
        inv => inv.status === 'ACTIVE'
      ).length;

      return {
        ...portfolio,
        totalInvested,
        activeInvestments,
      };
    });

    // Return the first portfolio if you expect only one per user
    // return enrichedPortfolios[0] ?? null;
    return enrichedPortfolios[0] ?? null;
  }

  // update a portfolio's information based on its ID.
  async patch(id: number, data: CreatePortfolioDto) {
    return this.prisma.portfolio.update({
      where: { id },
      data,
    });
  }

  // remove a portfolio by its ID. 
  async remove(id: number) {
    return this.prisma.portfolio.delete({ where: { id } });
  }

}
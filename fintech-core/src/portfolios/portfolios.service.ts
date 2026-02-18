import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma-service/prisma.service';

// servce for managing portfolios - create, list, etc.
@Injectable()
export class PortfoliosService {
  constructor(private prisma: PrismaService) {}

  // create a new portfolio with specified name and user ID. 
  // The request body should contain these details.
  async create(data: { name: string; userId: number }) {
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

  async patch(id: number, data: { name?: string }) {
    return this.prisma.portfolio.update({
      where: { id },
      data,
    });
  }


}
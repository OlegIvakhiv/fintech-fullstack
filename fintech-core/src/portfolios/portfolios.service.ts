import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma-service/prisma.service';
import { CreatePortfolioDto } from './dto/create-portfolios.dto';

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
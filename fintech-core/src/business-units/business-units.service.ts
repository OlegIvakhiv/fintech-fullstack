import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateBusinessUnitDto } from './dto/create-business-unit.dto';
import { UpdateBusinessUnitDto } from './dto/update-business-unit.dto';
import { PrismaService } from '../prisma-service/prisma.service';

@Injectable()
export class BusinessUnitsService {
  constructor(private prisma: PrismaService) {}

// create a new business unit with the provided details. 
// The request body should contain the necessary information for creating 
// the business unit, such as name, description, currency, and interest rate.
  async create(data: CreateBusinessUnitDto) { 
  return await this.prisma.businessUnit.create({
    data: {
      name: data.name,
      description: data.description,
      currency: data.currency,
      interestRate: data.interestRate,
      status: 'ACTIVE',
    },
  });
}

// get a list of all active business units in the system, 
// ordered by creation date (newest first).
  async findAll() {
    return await this.prisma.businessUnit.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });
  }


// retrieve details of a specific business unit by its ID.
  async findOne(id: number) {
    const unit = await this.prisma.businessUnit.findUnique({
      where: { id },
      include: {
        journalEntries: true, 
      }
    });
    if (!unit) throw new NotFoundException('Business Unit not found');
    return unit;
  }


// update a business unit's information based on its ID.
  async update(id: number, data: any) {
    return await this.prisma.businessUnit.update({
      where: { id },
      data,
    });
  }

  // Instead of physically deleting the business unit, 
  // we perform a soft delete by changing its status to 'INACTIVE'.
  async remove(id: number) {
    // soft delete - just mark as INACTIVE
    return await this.prisma.businessUnit.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });
  }
}

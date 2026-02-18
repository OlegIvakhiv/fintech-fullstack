import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateBusinessUnitDto } from './dto/create-business-unit.dto';
import { UpdateBusinessUnitDto } from './dto/update-business-unit.dto';
import { PrismaService } from '../prisma-service/prisma.service';

@Injectable()
export class BusinessUnitsService {
  constructor(private prisma: PrismaService) {}


  async create(data: CreateBusinessUnitDto) { // Використовуй клас DTO як тип
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
  async findAll() {
    return await this.prisma.businessUnit.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });
  }

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

  async update(id: number, data: any) {
    return await this.prisma.businessUnit.update({
      where: { id },
      data,
    });
  }

  async remove(id: number) {
    // Замість фізичного видалення краще робити soft delete (зміна статусу)
    return await this.prisma.businessUnit.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });
  }
}

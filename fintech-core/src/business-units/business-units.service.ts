import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateBusinessUnitDto } from './dto/create-business-unit.dto';
import { UpdateBusinessUnitDto } from './dto/update-business-unit.dto';
import { SetMonthlyROIDto } from './dto/set-monthly-roi.dto';
import { PrismaService } from '../prisma-service/prisma.service';
import { Currency } from '@prisma/client';
import Big from 'big.js';

Big.RM = Big.roundHalfEven;
Big.DP = 8;

@Injectable()
export class BusinessUnitsService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateBusinessUnitDto) {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    const month = data.month || currentMonth;
    const year = data.year || currentYear;

    if (month < 1 || month > 12)
      throw new BadRequestException('Month must be between 1 and 12');
    if (year > currentYear || (year === currentYear && month > currentMonth))
      throw new BadRequestException('Cannot create business unit with future date');

    const currency = data.currency as Currency;

    const bu = await this.prisma.businessUnit.create({
      data: {
        name: data.name,
        description: data.description,
        currency,
        interestRate: data.monthlyROI || 0,
        monthlyROI: data.monthlyROI || 0,
        annualROI: data.monthlyROI ? this.calculateAnnualROI(data.monthlyROI) : 0,
        status: 'ACTIVE',
      },
    });

    if (data.monthlyROI) {
      const totalDistributed = new Big(data.totalPoolValue?.toString() ?? '0')
        .times(new Big(data.monthlyROI.toString()))
        .div(100)
        .toString();

      await this.prisma.businessUnitROI.create({
        data: {
          businessUnitId: bu.id,
          month,
          year,
          monthlyROI: data.monthlyROI,
          totalPoolValue: data.totalPoolValue?.toString() ?? '0',
          totalDistributed,
          currency,
        },
      });
    }

    return bu;
  }

  async findAll() {
    return this.prisma.businessUnit.findMany({
      where: { status: 'ACTIVE' },
      include: {
        roiHistory: { orderBy: { createdAt: 'desc' }, take: 12 },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const unit = await this.prisma.businessUnit.findUnique({
      where: { id },
      include: {
        journalEntries: { orderBy: { createdAt: 'desc' }, take: 20 },
        roiHistory: { orderBy: [{ year: 'desc' }, { month: 'desc' }] },
      },
    });
    if (!unit) throw new NotFoundException('Business Unit not found');

    const investments = await this.prisma.investment.findMany({
      where: { businessUnitId: id, status: 'ACTIVE' },
      select: { amount: true, portfolio: { select: { userId: true } } },
    });

    const totalPoolValue = investments
      .reduce((sum, inv) => sum.plus(new Big(inv.amount.toString())), new Big(0))
      .toNumber();

    const uniqueInvestorIds = new Set(investments.map(inv => inv.portfolio.userId));

    return { ...unit, totalPoolValue, investorCount: uniqueInvestorIds.size };
  }

  async update(id: number, data: UpdateBusinessUnitDto) {
    const bu = await this.prisma.businessUnit.findUnique({ where: { id } });
    if (!bu) throw new NotFoundException('Business Unit not found');

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.currency !== undefined) updateData.currency = data.currency as Currency;

    if (data.monthlyROI !== undefined) {
      updateData.monthlyROI = data.monthlyROI;
      updateData.annualROI = this.calculateAnnualROI(data.monthlyROI);
      updateData.lastROIUpdate = new Date();

      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      const investments = await this.prisma.investment.findMany({
        where: { businessUnitId: id, status: 'ACTIVE' },
        select: { amount: true },
      });

      const totalPoolValue = investments
        .reduce((sum, inv) => sum.plus(new Big(inv.amount.toString())), new Big(0));

      const totalDistributed = totalPoolValue
        .times(new Big(data.monthlyROI.toString()))
        .div(100);

      await this.prisma.businessUnitROI.upsert({
        where: {
          businessUnitId_month_year: { businessUnitId: id, month: currentMonth, year: currentYear },
        },
        update: {
          monthlyROI: data.monthlyROI,
          totalPoolValue: totalPoolValue.toString(),
          totalDistributed: totalDistributed.toString(),
          updatedAt: new Date(),
        },
        create: {
          businessUnitId: id,
          month: currentMonth,
          year: currentYear,
          monthlyROI: data.monthlyROI,
          totalPoolValue: totalPoolValue.toString(),
          totalDistributed: totalDistributed.toString(),
          currency: (data.currency ?? bu.currency) as Currency,
        },
      });
    }

    return this.prisma.businessUnit.update({ where: { id }, data: updateData });
  }

  async setMonthlyROI(id: number, dto: SetMonthlyROIDto) {
    const bu = await this.prisma.businessUnit.findUnique({ where: { id } });
    if (!bu) throw new NotFoundException('Business Unit not found');

    if (dto.month < 1 || dto.month > 12)
      throw new BadRequestException('Month must be between 1 and 12');

    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    if (dto.year > currentYear || (dto.year === currentYear && dto.month > currentMonth))
      throw new BadRequestException('Cannot create ROI record for future date');

    const totalDistributed = new Big(dto.totalPoolValue.toString())
      .times(new Big(dto.monthlyROI.toString()))
      .div(100)
      .toString();

    const roiRecord = await this.prisma.businessUnitROI.upsert({
      where: {
        businessUnitId_month_year: { businessUnitId: id, month: dto.month, year: dto.year },
      },
      update: {
        monthlyROI: dto.monthlyROI,
        totalPoolValue: dto.totalPoolValue.toString(),
        totalDistributed,
        updatedAt: new Date(),
      },
      create: {
        businessUnitId: id,
        month: dto.month,
        year: dto.year,
        monthlyROI: dto.monthlyROI,
        totalPoolValue: dto.totalPoolValue.toString(),
        totalDistributed,
        currency: bu.currency,
      },
    });

    await this.prisma.businessUnit.update({
      where: { id },
      data: {
        monthlyROI: dto.monthlyROI,
        annualROI: this.calculateAnnualROI(dto.monthlyROI),
        lastROIUpdate: new Date(),
      },
    });

    return {
      message: `ROI set for ${this.getMonthName(dto.month)} ${dto.year}`,
      roiRecord,
    };
  }

  async deleteROI(buId: number, roiId: number) {
    const roiRecord = await this.prisma.businessUnitROI.findUnique({ where: { id: roiId } });
    if (!roiRecord) throw new NotFoundException('ROI record not found');
    if (roiRecord.businessUnitId !== buId)
      throw new BadRequestException('ROI record does not belong to this business unit');

    await this.prisma.businessUnitROI.delete({ where: { id: roiId } });

    const remaining = await this.prisma.businessUnitROI.findMany({
      where: { businessUnitId: buId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: 1,
    });

    const newMonthlyROI = remaining.length > 0 ? remaining[0].monthlyROI : null;
    const newAnnualROI = newMonthlyROI !== null ? this.calculateAnnualROI(newMonthlyROI) : null;

    await this.prisma.businessUnit.update({
      where: { id: buId },
      data: { monthlyROI: newMonthlyROI, annualROI: newAnnualROI, lastROIUpdate: new Date() },
    });

    return { message: 'ROI record deleted successfully', newCurrentROI: newMonthlyROI };
  }

  async getROIHistory(id: number, year?: number) {
    const where: any = { businessUnitId: id };
    if (year) where.year = year;

    return this.prisma.businessUnitROI.findMany({
      where,
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  async getCurrentMonthROI(id: number) {
    const now = new Date();
    return this.prisma.businessUnitROI.findUnique({
      where: {
        businessUnitId_month_year: {
          businessUnitId: id,
          month: now.getMonth() + 1,
          year: now.getFullYear(),
        },
      },
    });
  }

  async getCurrentMonthProjection(id: number, amount: number) {
    const unit = await this.prisma.businessUnit.findUnique({
      where: { id },
      select: { monthlyROI: true, currency: true },
    });
    if (!unit) throw new NotFoundException('Business Unit not found');

    const monthlyROI = unit.monthlyROI ?? 0;
    const projectedEarnings = new Big(amount.toString())
      .times(new Big(monthlyROI.toString()))
      .div(100)
      .round(8)
      .toNumber();

    return { monthlyROI, projectedEarnings, currency: unit.currency };
  }

  async calculateInvestorEarnings(
    investmentId: number,
    investmentAmount: number,
    businessUnitId: number,
  ) {
    const roiRecords = await this.prisma.businessUnitROI.findMany({
      where: { businessUnitId },
      orderBy: { createdAt: 'asc' },
    });

    if (roiRecords.length === 0) return { totalEarnings: 0, roiBreakdown: [] };

    let totalEarnings = new Big(0);
    const roiBreakdown = roiRecords.map((record) => {
      const poolValue = new Big(record.totalPoolValue.toString());
      if (poolValue.eq(0)) {
        return {
          month: this.getMonthName(record.month),
          year: record.year,
          monthlyROI: record.monthlyROI,
          poolValue: record.totalPoolValue,
          earned: 0,
        };
      }

      const investorShare = new Big(investmentAmount.toString())
        .div(poolValue)
        .times(new Big(record.totalDistributed.toString()));

      totalEarnings = totalEarnings.plus(investorShare);

      return {
        month: this.getMonthName(record.month),
        year: record.year,
        monthlyROI: record.monthlyROI,
        poolValue: record.totalPoolValue,
        earned: investorShare.round(8).toNumber(),
      };
    });

    return {
      totalEarnings: totalEarnings.round(8).toNumber(),
      roiBreakdown,
    };
  }

  private calculateAnnualROI(monthlyROI: number): number {
    return parseFloat(
      new Big(1)
        .plus(new Big(monthlyROI).div(100))
        .pow(12)
        .minus(1)
        .times(100)
        .toFixed(2)
    );
  }

  private getMonthName(month: number): string {
    return new Date(2024, month - 1).toLocaleDateString('en-US', { month: 'long' });
  }

  async remove(id: number) {
    return this.prisma.businessUnit.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });
  }
}
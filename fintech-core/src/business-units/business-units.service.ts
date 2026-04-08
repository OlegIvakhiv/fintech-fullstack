import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateBusinessUnitDto } from './dto/create-business-unit.dto';
import { UpdateBusinessUnitDto } from './dto/update-business-unit.dto';
import { SetMonthlyROIDto } from './dto/set-monthly-roi.dto';
import { PrismaService } from '../prisma-service/prisma.service';

// Service for managing business units - create, list, ROI tracking, etc.
@Injectable()
export class BusinessUnitsService {
  constructor(private prisma: PrismaService) {}

  // Create a new business unit with the provided details
  async create(data: CreateBusinessUnitDto) { 
    return await this.prisma.businessUnit.create({
      data: {
        name: data.name,
        description: data.description,
        currency: data.currency,
        interestRate: data.interestRate,
       monthlyROI: data.interestRate, // ✅ NEW: Initialize monthlyROI from interestRate
        status: 'ACTIVE',
      },
    });
  }

  // Get a list of all active business units in the system,
  // ordered by creation date (newest first)
  async findAll() {
    return await this.prisma.businessUnit.findMany({
      where: { status: 'ACTIVE' },
      include: {
        roiHistory: {
          orderBy: { createdAt: 'desc' },
          take: 12, // Last 12 months
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Retrieve details of a specific business unit by its ID
  // Includes full ROI history
  async findOne(id: number) {
    const unit = await this.prisma.businessUnit.findUnique({
      where: { id },
      include: {
        journalEntries: {
          orderBy: { createdAt: 'desc' },
          take: 20, // Last 20 entries
        },
        roiHistory: {
          orderBy: { createdAt: 'desc' },
          take: 12, // Last 12 months
        },
      }
    });
    if (!unit) throw new NotFoundException('Business Unit not found');
    return unit;
  }

  // Update a business unit's information based on its ID
  async update(id: number, data: any) {
    return await this.prisma.businessUnit.update({
      where: { id },
      data,
    });
  }

  // ✅ NEW: Set monthly ROI for a business unit
  // This creates or updates the ROI record for a specific month/year
  async setMonthlyROI(id: number, dto: SetMonthlyROIDto) {
    // Verify business unit exists
    const bu = await this.prisma.businessUnit.findUnique({
      where: { id },
    });
    if (!bu) throw new NotFoundException('Business Unit not found');

    // ✅ Validate month and year
    if (dto.month < 1 || dto.month > 12) {
      throw new BadRequestException('Month must be between 1 and 12');
    }
    if (dto.year < 2000 || dto.year > 2099) {
      throw new BadRequestException('Year must be between 2000 and 2099');
    }

    // Calculate distributed amount based on ROI and pool value
    const totalDistributed = (dto.totalPoolValue * dto.monthlyROI) / 100;

    // Create or update ROI record
    const roiRecord = await this.prisma.businessUnitROI.upsert({
      where: {
        businessUnitId_month_year: {
          businessUnitId: id,
          month: dto.month,
          year: dto.year,
        },
      },
      update: {
        monthlyROI: dto.monthlyROI,
        totalPoolValue: dto.totalPoolValue,
        totalDistributed: totalDistributed,
        updatedAt: new Date(),
      },
      create: {
        businessUnitId: id,
        month: dto.month,
        year: dto.year,
        monthlyROI: dto.monthlyROI,
        totalPoolValue: dto.totalPoolValue,
        totalDistributed: totalDistributed,
      },
    });

    // ✅ Update business unit's current monthlyROI and annualROI
    const annualROI = this.calculateAnnualROI(dto.monthlyROI);
    
    await this.prisma.businessUnit.update({
      where: { id },
      data: {
        monthlyROI: dto.monthlyROI,
        annualROI: annualROI,
        lastROIUpdate: new Date(),
      },
    });

    return {
      message: `ROI set for ${this.getMonthName(dto.month)} ${dto.year}`,
      roiRecord,
    };
  }

  // ✅ NEW: Get ROI history for a business unit
  async getROIHistory(id: number, year?: number) {
    const where: any = { businessUnitId: id };
    
    if (year) {
      where.year = year;
    }

    const history = await this.prisma.businessUnitROI.findMany({
      where,
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
      ],
    });

    if (history.length === 0) {
      throw new NotFoundException('No ROI history found for this business unit');
    }

    return history;
  }

  // ✅ NEW: Get current month's ROI for a business unit
  async getCurrentMonthROI(id: number) {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const roiRecord = await this.prisma.businessUnitROI.findUnique({
      where: {
        businessUnitId_month_year: {
          businessUnitId: id,
          month: currentMonth,
          year: currentYear,
        },
      },
    });

    return roiRecord || null;
  }


  // ✅ NEW: Get current month's simple projected earnings for a given amount
async getCurrentMonthProjection(id: number, amount: number) {
  const unit = await this.prisma.businessUnit.findUnique({
    where: { id },
    select: { monthlyROI: true, currency: true }
  });
  if (!unit) throw new NotFoundException('Business Unit not found');

  const monthlyROI = unit.monthlyROI ?? 0;
  const projectedEarnings = amount * (monthlyROI / 100);

  return {
    monthlyROI,
    projectedEarnings,
    currency: unit.currency,
  };
}

  // ✅ NEW: Calculate investor's earnings based on investment and ROI
  // This is used to show real-time earnings to investors
  async calculateInvestorEarnings(
    investmentId: number,
    investmentAmount: number,
    businessUnitId: number
  ) {
    // Get all ROI records for this business unit
    const roiRecords = await this.prisma.businessUnitROI.findMany({
      where: { businessUnitId },
      orderBy: { createdAt: 'asc' },
    });

    if (roiRecords.length === 0) {
      return {
        totalEarnings: 0,
        roiBreakdown: [],
      };
    }

    let totalEarnings = 0;
    const roiBreakdown = roiRecords.map((record) => {
      // Calculate investor's share of earnings for this month
      // Earnings = (Investment Amount / Total Pool Value) × Total Distributed
      const investorShare =
        (investmentAmount / Number(record.totalPoolValue)) *
        Number(record.totalDistributed);

      totalEarnings += investorShare;

      return {
        month: this.getMonthName(record.month),
        year: record.year,
        monthlyROI: record.monthlyROI,
        poolValue: record.totalPoolValue,
        earned: investorShare,
      };
    });

    return {
      totalEarnings,
      roiBreakdown,
    };
  }

  // ✅ HELPER: Calculate annual ROI from monthly ROI
  // Formula: (1 + monthly/100)^12 - 1
  private calculateAnnualROI(monthlyROI: number): number {
    const monthlyRate = 1 + monthlyROI / 100;
    const annualRate = Math.pow(monthlyRate, 12) - 1;
    return parseFloat((annualRate * 100).toFixed(2)); // Return as percentage
  }

  // ✅ HELPER: Convert month number to name
  private getMonthName(month: number): string {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    return months[month - 1];
  }

  // Soft delete - mark as INACTIVE instead of physical deletion
  async remove(id: number) {
    return await this.prisma.businessUnit.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });
  }
}
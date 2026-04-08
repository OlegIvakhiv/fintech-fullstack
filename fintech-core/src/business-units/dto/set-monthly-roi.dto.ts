import { IsNumber, IsInt, Min, Max } from 'class-validator';

// ✅ NEW: DTO for setting/updating monthly ROI on a business unit
export class SetMonthlyROIDto {
  @IsInt()
  @Min(1)
  @Max(12)
  month: number; // Month (1-12)

  @IsInt()
  @Min(2000)
  @Max(2099)
  year: number; // Year (e.g., 2024, 2025)

  @IsNumber()
  @Min(0)
  monthlyROI: number; // ROI percentage (e.g., 1.5 means 1.5%)

  @IsNumber()
  @Min(0)
  totalPoolValue: number; // Total funds in BU this month (e.g., 50000)
}

// ✅ NEW: DTO for getting ROI history
export class GetROIHistoryQueryDto {
  year?: number; // Optional: filter by year
  month?: number; // Optional: filter by month
}
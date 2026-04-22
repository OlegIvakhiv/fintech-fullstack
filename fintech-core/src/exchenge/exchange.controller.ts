import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ExchangeService } from './exchange.service';
import { ConvertCurrencyDto } from './dto/convert-currency.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guards';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { Role } from '@prisma/client';

@Controller('exchange')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExchangeController {
  constructor(private readonly exchangeService: ExchangeService) {}

  /**
   * GET /exchange/rates
   *
   * Returns the current NBU rate snapshot used by the live widget.
   * Served from cache (max 5-minute staleness). Both roles can access.
   *
   * Response shape:
   * {
   *   USD: 41.24,        // UAH per 1 USD
   *   EUR: 44.87,        // UAH per 1 EUR
   *   UAH: 1,
   *   fetchedAt: "2025-04-08T10:00:00.000Z",
   *   exchangeDate: "08.04.2025",
   *   feePercent: 0.5
   * }
   */
  @Get('rates')
  @Roles(Role.ADMIN, Role.INVESTOR)
  async getRates() {
    const snapshot = await this.exchangeService.getRates();
    return {
      ...snapshot,
      feePercent: this.exchangeService.getFeePercent(),
    };
  }

  /**
   * POST /exchange/convert
   *
   * Converts an amount between USD, EUR, and UAH, applying the 0.5% fee.
   * Body: { amount: number, from: 'USD'|'EUR'|'UAH', to: 'USD'|'EUR'|'UAH' }
   *
   * Response shape:
   * {
   *   original:      { amount: 100,     currency: 'USD' },
   *   converted:     { amount: 4095.78, currency: 'UAH' },
   *   fee:           { amount: 20.58,   currency: 'UAH' },
   *   grossAmount:   4116.36,
   *   officialRate:  41.163600,   // 1 USD = N UAH, no fee
   *   effectiveRate: 40.957800,   // 1 USD = N UAH, after fee
   *   feePercent:    0.5,
   *   fetchedAt:     "2025-04-08T10:00:00.000Z",
   *   exchangeDate:  "08.04.2025"
   * }
   */
  @Post('convert')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN, Role.INVESTOR)
  async convert(@Body() dto: ConvertCurrencyDto) {
    return this.exchangeService.convert(dto.amount, dto.from, dto.to);
  }

  /**
   * GET /exchange/info
   *
   * Returns metadata about the exchange service — supported currencies,
   * fee percentage, and cache TTL. Useful for the frontend to display
   * fee info without hard-coding values.
   */
  @Get('info')
  @Roles(Role.ADMIN, Role.INVESTOR)
  getInfo() {
    return {
      supportedCurrencies: ['USD', 'EUR', 'UAH'],
      feePercent: this.exchangeService.getFeePercent(),
      cacheTtlMinutes: 5,
      dataSource: 'National Bank of Ukraine (bank.gov.ua)',
      note: 'Rates refresh automatically every 5 minutes from the NBU official feed.',
    };
  }

  /**
   * POST /exchange/refresh
   *
   * Admin-only. Forces an immediate cache refresh from NBU regardless of TTL.
   * Useful after a suspected data issue or after NBU publishes a mid-day fix.
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN)
  async forceRefresh() {
    const snapshot = await this.exchangeService.forceRefresh();
    return {
      message: 'Exchange rates refreshed successfully',
      ...snapshot,
      feePercent: this.exchangeService.getFeePercent(),
    };
  }
}

import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  BadRequestException,
} from '@nestjs/common';
import { SupportedCurrency } from './dto/convert-currency.dto';
import Big from 'big.js';

Big.RM = Big.roundHalfEven;
Big.DP = 8;

// ─── Types ────────────────────────────────────────────────────────────────────

interface NbuRateEntry {
  r030: number;
  txt: string;
  rate: number;
  cc: string;
  exchangedate: string;
}

export interface RateSnapshot {
  USD: number;
  EUR: number;
  UAH: number;
  fetchedAt: string;
  exchangeDate: string;
}

export interface ConversionResult {
  original: { amount: number; currency: SupportedCurrency };
  converted: { amount: number; currency: SupportedCurrency };
  fee: { amount: number; currency: SupportedCurrency };
  grossAmount: number;
  officialRate: number;
  effectiveRate: number;
  feePercent: number;
  fetchedAt: string;
  exchangeDate: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const NBU_URL = 'https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json';
const CACHE_TTL_MS = 5 * 60 * 1000;
const CONVERSION_FEE_PERCENT = 0.5;

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class ExchangeService {
  private readonly logger = new Logger(ExchangeService.name);
  private cachedRates: RateSnapshot | null = null;
  private cacheExpiresAt: number = 0;

  async getRates(): Promise<RateSnapshot> {
    if (this.isCacheValid()) {
      this.logger.debug('Serving rates from cache');
      return this.cachedRates!;
    }
    return this.fetchAndCache();
  }

async convert(
  amount: number,
  from: SupportedCurrency,
  to: SupportedCurrency,
): Promise<ConversionResult> {
  if (from === to) {
    throw new BadRequestException('Source and destination currencies must differ');
  }

  const rates = await this.getRates();

  const fromRate = new Big(rates[from].toString());
  const toRate = new Big(rates[to].toString());
  const amountBig = new Big(amount.toString());

  const officialRate = fromRate.div(toRate);
  const grossAmount = amountBig.times(officialRate);
  const feeAmount = grossAmount.times(new Big(CONVERSION_FEE_PERCENT.toString()).div(100));
  const netAmount = grossAmount.minus(feeAmount);
  const effectiveRate = netAmount.div(amountBig);

  return {
    original: { amount, currency: from },
    converted: { amount: netAmount.round(8).toNumber(), currency: to },
    fee: { amount: feeAmount.round(8).toNumber(), currency: to },
    grossAmount: grossAmount.round(8).toNumber(),
    officialRate: officialRate.round(8).toNumber(),
    effectiveRate: effectiveRate.round(8).toNumber(),
    feePercent: CONVERSION_FEE_PERCENT,
    fetchedAt: rates.fetchedAt,
    exchangeDate: rates.exchangeDate,
  };
}

  getFeePercent(): number {
    return CONVERSION_FEE_PERCENT;
  }

  async forceRefresh(): Promise<RateSnapshot> {
    this.logger.log('Force-refreshing exchange rates');
    return this.fetchAndCache();
  }

  private isCacheValid(): boolean {
    return this.cachedRates !== null && Date.now() < this.cacheExpiresAt;
  }

  private async fetchAndCache(): Promise<RateSnapshot> {
    try {
      this.logger.log('Fetching fresh rates from NBU');
      const res = await fetch(NBU_URL, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) {
        throw new Error(`NBU responded with HTTP ${res.status}`);
      }
      const entries: NbuRateEntry[] = await res.json();
      const snapshot = this.buildSnapshot(entries);
      this.cachedRates = snapshot;
      this.cacheExpiresAt = Date.now() + CACHE_TTL_MS;
      this.logger.log(
        `Rates cached until ${new Date(this.cacheExpiresAt).toISOString()} ` +
        `(USD=${snapshot.USD}, EUR=${snapshot.EUR})`,
      );
      return snapshot;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to fetch rates from NBU: ${errorMessage}`);
      if (this.cachedRates) {
        this.logger.warn('Returning stale cached rates as fallback');
        return this.cachedRates;
      }
      throw new ServiceUnavailableException(
        'Exchange rate service is temporarily unavailable. Please try again shortly.',
      );
    }
  }

  private buildSnapshot(entries: NbuRateEntry[]): RateSnapshot {
    const rateMap = new Map(entries.map(e => [e.cc, e]));
    const getRate = (cc: SupportedCurrency): number => {
      const entry = rateMap.get(cc);
      if (!entry || typeof entry.rate !== 'number' || entry.rate <= 0) {
        throw new Error(`NBU feed missing valid rate for ${cc}`);
      }
      return entry.rate;
    };
    const exchangeDate =
      rateMap.get(SupportedCurrency.USD)?.exchangedate ??
      entries[0]?.exchangedate ??
      'unknown';
    return {
      USD: getRate(SupportedCurrency.USD),
      EUR: getRate(SupportedCurrency.EUR),
      UAH: 1,
      fetchedAt: new Date().toISOString(),
      exchangeDate,
    };
  }
}

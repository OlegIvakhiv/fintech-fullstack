import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException, BadRequestException } from '@nestjs/common';
import { ExchangeService, RateSnapshot } from './exchange.service';
import { SupportedCurrency } from './dto/convert-currency.dto';

// ─── NBU feed fixture ─────────────────────────────────────────────────────────

const NBU_FIXTURE = [
  { r030: 840, txt: 'Долар США',  rate: 41.2456, cc: 'USD', exchangedate: '08.04.2025' },
  { r030: 978, txt: 'Євро',       rate: 44.8712, cc: 'EUR', exchangedate: '08.04.2025' },
  { r030: 826, txt: 'Фунт',       rate: 52.1000, cc: 'GBP', exchangedate: '08.04.2025' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockFetchSuccess(data = NBU_FIXTURE) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => data,
  } as Response);
}

function mockFetchFailure(status = 503) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    status,
    json: async () => ({}),
  } as Response);
}

function mockFetchNetworkError() {
  global.fetch = jest.fn().mockRejectedValue(new Error('network timeout'));
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ExchangeService', () => {
  let service: ExchangeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExchangeService],
    }).compile();

    service = module.get<ExchangeService>(ExchangeService);

    // Reset private cache between tests
    (service as any).cachedRates = null;
    (service as any).cacheExpiresAt = 0;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── getRates ──────────────────────────────────────────────────────────────

  describe('getRates()', () => {
    it('fetches from NBU when cache is empty', async () => {
      mockFetchSuccess();
      const rates = await service.getRates();

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(rates.USD).toBe(41.2456);
      expect(rates.EUR).toBe(44.8712);
      expect(rates.UAH).toBe(1);
      expect(rates.exchangeDate).toBe('08.04.2025');
      expect(rates.fetchedAt).toBeDefined();
    });

    it('returns cached rates without re-fetching within TTL', async () => {
      mockFetchSuccess();
      await service.getRates(); // populates cache
      await service.getRates(); // should hit cache

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('re-fetches when cache has expired', async () => {
      mockFetchSuccess();
      await service.getRates();

      // Expire the cache
      (service as any).cacheExpiresAt = Date.now() - 1;
      await service.getRates();

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('throws ServiceUnavailableException when NBU is down and no cache exists', async () => {
      mockFetchNetworkError();
      await expect(service.getRates()).rejects.toThrow(ServiceUnavailableException);
    });

    it('returns stale cache when NBU is down but cache exists', async () => {
      // Warm the cache
      mockFetchSuccess();
      await service.getRates();

      // Expire and then fail
      (service as any).cacheExpiresAt = Date.now() - 1;
      mockFetchNetworkError();

      const rates = await service.getRates(); // should not throw
      expect(rates.USD).toBe(41.2456);        // stale but available
    });

    it('returns stale cache when NBU returns non-200', async () => {
      mockFetchSuccess();
      await service.getRates();

      (service as any).cacheExpiresAt = Date.now() - 1;
      mockFetchFailure(503);

      const rates = await service.getRates();
      expect(rates.USD).toBe(41.2456);
    });

    it('snapshot always has UAH = 1', async () => {
      mockFetchSuccess();
      const rates = await service.getRates();
      expect(rates.UAH).toBe(1);
    });
  });

  // ── convert ───────────────────────────────────────────────────────────────

  describe('convert()', () => {
    beforeEach(() => mockFetchSuccess());

    it('throws BadRequestException when from === to', async () => {
      await expect(
        service.convert(100, SupportedCurrency.USD, SupportedCurrency.USD),
      ).rejects.toThrow(BadRequestException);
    });

    it('converts USD → UAH correctly with 0.5% fee', async () => {
      const result = await service.convert(100, SupportedCurrency.USD, SupportedCurrency.UAH);

      // gross = 100 * 41.2456 = 4124.56
      // fee   = 4124.56 * 0.005 = 20.62 (rounded)
      // net   = 4124.56 - 20.62 = 4103.94
      expect(result.original).toEqual({ amount: 100, currency: SupportedCurrency.USD });
      expect(result.converted.currency).toBe(SupportedCurrency.UAH);
      expect(result.fee.currency).toBe(SupportedCurrency.UAH);
      expect(result.feePercent).toBe(0.5);

      // net should be gross minus fee
      expect(result.converted.amount).toBeCloseTo(result.grossAmount - result.fee.amount, 1);
    });

    it('converts UAH → USD with fee deducted from destination', async () => {
      const result = await service.convert(1000, SupportedCurrency.UAH, SupportedCurrency.USD);
      // officialRate = 1 / 41.2456 ≈ 0.024245
      expect(result.officialRate).toBeCloseTo(1 / 41.2456, 4);
      expect(result.converted.currency).toBe(SupportedCurrency.USD);
      expect(result.converted.amount).toBeLessThan(result.grossAmount);
    });

    it('converts EUR → USD via UAH cross-rate', async () => {
      const result = await service.convert(100, SupportedCurrency.EUR, SupportedCurrency.USD);
      // officialRate = 44.8712 / 41.2456 ≈ 1.0879
      expect(result.officialRate).toBeCloseTo(44.8712 / 41.2456, 3);
    });

    it('effectiveRate accounts for fee', async () => {
      const result = await service.convert(100, SupportedCurrency.USD, SupportedCurrency.EUR);
      // effectiveRate should be officialRate * (1 - 0.005)
      expect(result.effectiveRate).toBeCloseTo(result.officialRate * 0.995, 4);
    });

    it('fee is exactly 0.5% of grossAmount', async () => {
      const result = await service.convert(500, SupportedCurrency.USD, SupportedCurrency.UAH);
      const expectedFee = result.grossAmount * 0.005;
      expect(result.fee.amount).toBeCloseTo(expectedFee, 1);
    });

    it('propagates rate-fetch failure as ServiceUnavailableException', async () => {
      (service as any).cachedRates = null;
      (service as any).cacheExpiresAt = 0;
      mockFetchNetworkError();

      await expect(
        service.convert(100, SupportedCurrency.USD, SupportedCurrency.UAH),
      ).rejects.toThrow(ServiceUnavailableException);
    });
  });

  // ── forceRefresh ──────────────────────────────────────────────────────────

  describe('forceRefresh()', () => {
    it('bypasses valid cache and fetches from NBU', async () => {
      mockFetchSuccess();
      await service.getRates(); // fills cache

      // Tamper with cached value so we can tell if it was replaced
      (service as any).cachedRates.USD = 99;

      await service.forceRefresh();

      const rates = await service.getRates();
      expect(rates.USD).toBe(41.2456); // restored from fresh fetch
      expect(global.fetch).toHaveBeenCalledTimes(2); // initial + force
    });
  });

  // ── getFeePercent ─────────────────────────────────────────────────────────

  describe('getFeePercent()', () => {
    it('returns 0.5', () => {
      expect(service.getFeePercent()).toBe(0.5);
    });
  });
});

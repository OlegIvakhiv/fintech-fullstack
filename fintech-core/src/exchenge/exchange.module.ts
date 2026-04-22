import { Module } from '@nestjs/common';
import { ExchangeService } from './exchange.service';
import { ExchangeController } from './exchange.controller';

/**
 * ExchangeModule
 *
 * Self-contained — no PrismaModule dependency because rates are fetched
 * from the NBU HTTP API and cached in-process. Import this module in
 * AppModule alongside your other feature modules.
 *
 * Usage in app.module.ts:
 *   import { ExchangeModule } from './exchange/exchange.module';
 *   @Module({ imports: [..., ExchangeModule] })
 */
@Module({
  controllers: [ExchangeController],
  providers: [ExchangeService],
  // Export the service so other modules (e.g. a future ReportsModule) can
  // inject ExchangeService directly without re-declaring it.
  exports: [ExchangeService],
})
export class ExchangeModule {}

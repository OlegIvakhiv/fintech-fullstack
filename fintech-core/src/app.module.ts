import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { ConfigModule } from '@nestjs/config';
import { TransactionsModule } from './transactions/transactions.module';
import { AccountsModule } from './accounts/accounts.module';
import { PortfoliosModule } from './portfolios/portfolios.module';

// The main application module that imports all feature modules (Users, Transactions, Accounts, Portfolios) and sets up global configuration. 
// It also defines the main controller and service for the application.

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), UsersModule, TransactionsModule, AccountsModule, PortfoliosModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

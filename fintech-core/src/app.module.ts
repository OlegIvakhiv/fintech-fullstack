import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { ConfigModule } from '@nestjs/config';
import { TransactionsModule } from './transactions/transactions.module';
import { AccountsModule } from './accounts/accounts.module';
import { PortfoliosModule } from './portfolios/portfolios.module';
import { BusinessUnitsModule } from './business-units/business-units.module';
import { PrismaModule } from './prisma-service/prisma.module';
import { AuthModule } from './auth/auth-module';
import { WithdrawalRequestsModule } from './withdrawal-requests/withdrawal-requests.module';
import { DashboardService } from './dashboard/dashboard.service';
import { DashboardController } from './dashboard/dashboard.controller';
import { DashboardModule } from './dashboard/dashboard.module';

// The main application module that imports all feature modules (Users, Transactions, Accounts, Portfolios) and sets up global configuration. 
// It also defines the main controller and service for the application. 


@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), UsersModule, 
    TransactionsModule, 
    AccountsModule, 
    PortfoliosModule, 
    BusinessUnitsModule,
    AuthModule,
    PrismaModule,
    WithdrawalRequestsModule,
    DashboardModule
  ],
  controllers: [AppController,  DashboardController],
  providers: [AppService, DashboardService],

})
export class AppModule {}

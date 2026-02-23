import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma-service/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { CreateDepositDto, CreateDivestmentDto, CreateInvestmentDto, CreateTransferDto, CreateWithdrawDto } from './dto/create-transactions.dto';
import { InvestmentStatus, TransactionType } from '@prisma/client';

@Injectable()
export class TransactionsService {
    constructor(private prisma: PrismaService) { }

    // trasfer - moving money from one account to another, 
    // with double entry in JournalEntry for both accounts 
    // (this function is not nesesery for product and can be deleted,
    // but it is a good example of how to do a complex transaction 
    // with multiple steps and error handling)

    async createTransfer(dto: CreateTransferDto) {
        if (dto.fromAccountId === dto.toAccountId) {
            throw new BadRequestException('Source and destination accounts must be different');
        }

        const transactionId = uuidv4();

        return await this.prisma.$transaction(async (tx) => {
            // geetting the sender's account to check balance and update it
            const sender = await tx.account.update({
                where: { id: dto.fromAccountId },
                data: { balance: { decrement: dto.amount } }
            });

            if (Number(sender.balance) < 0) {
                throw new BadRequestException('Insufficient funds in source account');
            }

            //  adding to the second account
            await tx.account.update({
                where: { id: dto.toAccountId },
                data: { balance: { increment: dto.amount } }
            });

            //  double entry into JournalEntry for both accounts
            await tx.journalEntry.createMany({
                data: [
                    {
                        amount: -dto.amount,
                        accountId: dto.fromAccountId,
                        transactionId,
                        type: 'TRANSFER',
                        description: dto.description || `Transfer to account #${dto.toAccountId}`,
                    },
                    {
                        amount: dto.amount,
                        accountId: dto.toAccountId,
                        transactionId,
                        type: 'TRANSFER',
                        description: dto.description || `Transfer from account #${dto.fromAccountId}`,
                    }
                ]
            });

            return { transactionId, status: 'SUCCESS' };
        });
    }


    // deposit - adding money to the account
    async deposit(dto: CreateDepositDto) {
        const transactionId = uuidv4();
        return await this.prisma.$transaction(async (tx) => {
            const account = await tx.account.update({
                where: { id: dto.accountId },
                data: { balance: { increment: dto.amount } }
            });

            await tx.journalEntry.create({
                data: {
                    amount: dto.amount,
                    accountId: dto.accountId,
                    transactionId,
                    type: 'DEPOSIT',
                    description: dto.description || 'System Deposit',
                }
            });
            return { transactionId, status: 'SUCCESS', newBalance: account.balance };
        });
    }



    // withdraw - taking money out of the account
    async withdraw(dto: CreateWithdrawDto) {
        const transactionId = uuidv4();

        return await this.prisma.$transaction(async (tx) => {
            // checking the account and balance
            const account = await tx.account.findUnique({ where: { id: dto.accountId } });

            if (!account) throw new NotFoundException('Account not found');
            if (Number(account.balance) < dto.amount) {
                throw new BadRequestException('Insufficient funds for withdrawal');
            }

            // update the account - decrease the balance
            const updatedAccount = await tx.account.update({
                where: { id: dto.accountId },
                data: { balance: { decrement: dto.amount } }
            });

            // writing to JournalEntry
            await tx.journalEntry.create({
                data: {
                    amount: -dto.amount,
                    accountId: dto.accountId,
                    transactionId,
                    type: 'WITHDRAW',
                    description: dto.description || 'Funds withdrawal',
                }
            });

            return { transactionId, newBalance: updatedAccount.balance, status: 'SUCCESS' };
        });
    }


    // Divestment - moving money from the business unit back to the account,
    // with double entry in JournalEntry for both account and business unit

    async divest(dto: CreateDivestmentDto) {
        const transactionId = uuidv4();

        return await this.prisma.$transaction(async (tx) => {
            // finding the account to return money to and check if it exists
            const account = await tx.account.findUnique({
                where: { id: dto.accountId }
            });
            if (!account) throw new NotFoundException('Рахунок для повернення не знайдено');

            // Finding the active investment for this account and business unit
            const investment = await tx.investment.findFirst({
                where: {
                    portfolioId: account.portfolioId,
                    businessUnitId: dto.businessUnitId,
                    status: InvestmentStatus.ACTIVE
                },
                include: { businessUnit: true }
            });

            if (!investment) throw new BadRequestException('Активної інвестиції в цей проект не знайдено');
            if (Number(investment.amount) < dto.amount) throw new BadRequestException('Сума перевищує тіло інвестиції');

            // Update the investment - decrease the amount and if it becomes 0, mark as WITHDRAWN
            const newAmount = Number(investment.amount) - dto.amount;
            await tx.investment.update({
                where: { id: investment.id },
                data: {
                    amount: { decrement: dto.amount },
                    status: newAmount <= 0 ? InvestmentStatus.WITHDRAWN : InvestmentStatus.ACTIVE
                }
            });

            // return money to the account
            await tx.account.update({
                where: { id: dto.accountId },
                data: { balance: { increment: dto.amount } }
            });

            // double entry in JournalEntry for both account and business unit
            return await tx.journalEntry.create({
                data: {
                    amount: dto.amount,
                    accountId: dto.accountId,
                    businessUnitId: dto.businessUnitId,
                    investmentId: investment.id,
                    transactionId: transactionId,
                    type: TransactionType.DIVEST,
                    description: dto.description || `Вивід з проекту ${investment.businessUnit.name}`,
                }
            });
        });
    }


    // invest - moving money from the account to the business unit, 
    // with double entry in JournalEntry for both account and business unit
    async invest(dto: CreateInvestmentDto) {
        const transactionId = uuidv4();

        return await this.prisma.$transaction(async (tx) => {
            // 1. Перевірка рахунку та балансу
            const account = await tx.account.findUnique({
                where: { id: dto.accountId },
                include: { Portfolio: true }
            });

            if (!account) throw new NotFoundException('Рахунок не знайдено');
            if (Number(account.balance) < dto.amount) {
                throw new BadRequestException('Недостатньо коштів на рахунку');
            }

            // 2. Списання з балансу
            await tx.account.update({
                where: { id: dto.accountId },
                data: { balance: { decrement: dto.amount } }
            });

            // 3. Робота з інвестицією
            const bu = await tx.businessUnit.findUnique({ where: { id: dto.businessUnitId } });
            if (!bu) throw new NotFoundException('Бізнес-юніт не знайдено');

            // Шукаємо існуючу активну інвестицію для цього портфеля
            let investment = await tx.investment.findFirst({
                where: {
                    portfolioId: account.portfolioId,
                    businessUnitId: dto.businessUnitId,
                    status: InvestmentStatus.ACTIVE
                }
            });

            if (investment) {
                investment = await tx.investment.update({
                    where: { id: investment.id },
                    data: { amount: { increment: dto.amount } }
                });
            } else {
                investment = await tx.investment.create({
                    data: {
                        portfolioId: account.portfolioId,
                        businessUnitId: dto.businessUnitId,
                        amount: dto.amount,
                        currency: bu.currency,
                        status: InvestmentStatus.ACTIVE
                    }
                });
            }

            // 4. Лог у JournalEntry
            return await tx.journalEntry.create({
                data: {
                    amount: dto.amount,
                    accountId: dto.accountId,
                    businessUnitId: dto.businessUnitId,
                    investmentId: investment.id,
                    transactionId: transactionId,
                    type: TransactionType.INVEST,
                    description: dto.description || `Інвестиція в ${bu.name}`,
                }
            });
        });
    }



    // --- ADMINISTRATION FUNCTIONS ---

    // get all transactions, with optional filtering by type (DEPOSIT, WITHDRAW, TRANSFER, INVEST)
    async findAll() {
        return await this.prisma.journalEntry.findMany({
            include: {
                account: { include: { Portfolio: { include: { user: true } } } },
                businessUnit: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    // Search transactions by type (DEPOSIT, WITHDRAW, TRANSFER, INVEST)
    async findByType(type: string) {
        return await this.prisma.journalEntry.findMany({
            where: { type: type as any },
            include: { account: true, businessUnit: true },
        });
    }


    // get transaction history for a specific account, 
    // ordered by date (newest first)
    async getAccountHistory(accountId: number) {
        return await this.prisma.journalEntry.findMany({
            where: { accountId },
            include: {
                businessUnit: {
                    select: { name: true } // Одразу бачимо, куди інвестували
                }
            },
            orderBy: { createdAt: 'desc' },
        });
    }
}

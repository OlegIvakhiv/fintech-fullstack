import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma-service/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { CreateDepositDto, CreateInvestmentDto, CreateTransferDto, CreateWithdrawDto } from './dto/create-transactions.dto';

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
            // 1. Перевірка існування акаунта та балансу
            const account = await tx.account.findUnique({ where: { id: dto.accountId } });

            if (!account) throw new NotFoundException('Account not found');
            if (Number(account.balance) < dto.amount) {
                throw new BadRequestException('Insufficient funds for withdrawal');
            }

            // 2. Оновлення балансу (зменшення)
            const updatedAccount = await tx.account.update({
                where: { id: dto.accountId },
                data: { balance: { decrement: dto.amount } }
            });

            // 3. Запис у JournalEntry
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

    // invest - moving money from an account to a business unit,
    // with a single entry in JournalEntry (since it's a one-sided transaction from the account's perspective)
    async invest(dto: CreateInvestmentDto) {
        const transactionId = uuidv4();
        return await this.prisma.$transaction(async (tx) => {
            const account = await tx.account.findUnique({ where: { id: dto.accountId } });
            if (!account || Number(account.balance) < dto.amount) {
                throw new BadRequestException('Insufficient funds or account not found');
            }

            await tx.account.update({
                where: { id: dto.accountId },
                data: { balance: { decrement: dto.amount } }
            });

            return await tx.journalEntry.create({
                data: {
                    amount: -dto.amount,
                    accountId: dto.accountId,
                    businessUnitId: dto.businessUnitId,
                    transactionId,
                    type: 'INVEST',
                    description: dto.description,
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

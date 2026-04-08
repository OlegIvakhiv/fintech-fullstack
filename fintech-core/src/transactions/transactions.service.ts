import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma-service/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { CreateDepositDto, CreateDivestmentDto, CreateInvestmentDto, CreateTransferDto, CreateWithdrawDto } from './dto/create-transactions.dto';
import { InvestmentStatus, TransactionType } from '@prisma/client';

@Injectable()
export class TransactionsService {
    constructor(private prisma: PrismaService) { }

    // ========== EXISTING METHODS ==========

    // Transfer - moving money from one account to another, 
    // with double entry in JournalEntry for both accounts 
    // (NOTE: not necessary for product - kept as reference implementation)
    async createTransfer(dto: CreateTransferDto) {
        if (dto.fromAccountId === dto.toAccountId) {
            throw new BadRequestException('Source and destination accounts must be different');
        }

        const transactionId = uuidv4();

        return await this.prisma.$transaction(async (tx) => {
            // Getting the sender's account to check balance and update it
            const sender = await tx.account.update({
                where: { id: dto.fromAccountId },
                data: { balance: { decrement: dto.amount } }
            });

            if (Number(sender.balance) < 0) {
                throw new BadRequestException('Insufficient funds in source account');
            }

            // Adding to the second account
            await tx.account.update({
                where: { id: dto.toAccountId },
                data: { balance: { increment: dto.amount } }
            });

            // Double entry into JournalEntry for both accounts
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

    // Deposit - adding money to the account
    // Used by admins to add funds to investor accounts
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

    // Withdraw - taking money out of the account
    // Used for Type 3 withdrawals (Account to External)
    // Now called withdrawToExternal to clarify its purpose
    async withdraw(dto: CreateWithdrawDto) {
        const transactionId = uuidv4();

        return await this.prisma.$transaction(async (tx) => {
            // Check the account and balance
            const account = await tx.account.findUnique({ where: { id: dto.accountId } });

            if (!account) throw new NotFoundException('Account not found');
            if (Number(account.balance) < dto.amount) {
                throw new BadRequestException('Insufficient funds for withdrawal');
            }

            // Update the account - decrease the balance
            const updatedAccount = await tx.account.update({
                where: { id: dto.accountId },
                data: { balance: { decrement: dto.amount } }
            });

            // Write to JournalEntry
            await tx.journalEntry.create({
                data: {
                    amount: -dto.amount,
                    accountId: dto.accountId,
                    transactionId,
                    type: 'WITHDRAW',
                    description: dto.description || 'External funds withdrawal',
                }
            });

            return { 
                transactionId, 
                newBalance: updatedAccount.balance, 
                status: 'SUCCESS',
                description: 'Funds withdrawn from account to external wallet'
            };
        });
    }

    // Alternative name for withdraw - more explicit about purpose
    // Type 3: Account to External Withdrawal
    async withdrawToExternal(dto: CreateWithdrawDto) {
        // Simply delegates to withdraw() since the logic is identical
        // The difference is semantic - this is explicitly for external withdrawals
        return this.withdraw(dto);
    }

    // Divest - moving money from the business unit back to the account
    // Type 1: Business Unit to Account
    // Also used as the first step in Type 2 transfers
    async divest(dto: CreateDivestmentDto) {
        const transactionId = uuidv4();

        return await this.prisma.$transaction(async (tx) => {
            // Find the account to return money to and check if it exists
            const account = await tx.account.findUnique({
                where: { id: dto.accountId }
            });
            if (!account) throw new NotFoundException('Account not found for divestment');

            // Find the active investment for this account and business unit
            const investment = await tx.investment.findFirst({
                where: {
                    portfolioId: account.portfolioId,
                    businessUnitId: dto.businessUnitId,
                    status: InvestmentStatus.ACTIVE
                },
                include: { businessUnit: true }
            });

            if (!investment) throw new BadRequestException('No active investment in this business unit');
            if (Number(investment.amount) < dto.amount) throw new BadRequestException('Withdrawal amount exceeds invested amount');

            // Update the investment - decrease the amount and if it becomes 0, mark as WITHDRAWN
            const newAmount = Number(investment.amount) - dto.amount;
            await tx.investment.update({
                where: { id: investment.id },
                data: {
                    amount: { decrement: dto.amount },
                    status: newAmount <= 0 ? InvestmentStatus.WITHDRAWN : InvestmentStatus.ACTIVE
                }
            });

            // Return money to the account
            await tx.account.update({
                where: { id: dto.accountId },
                data: { balance: { increment: dto.amount } }
            });

            // Create journal entry for the divestment
            return await tx.journalEntry.create({
                data: {
                    amount: dto.amount,
                    accountId: dto.accountId,
                    businessUnitId: dto.businessUnitId,
                    investmentId: investment.id,
                    transactionId: transactionId,
                    type: TransactionType.DIVEST,
                    description: dto.description || `Withdrawal from investment in ${investment.businessUnit.name}`,
                }
            });
        });
    }

    // Invest - moving money from the account to the business unit
    // Account to Business Unit
    async invest(dto: CreateInvestmentDto) {
        const transactionId = uuidv4();

        return await this.prisma.$transaction(async (tx) => {
            // 1. Check account and balance
            const account = await tx.account.findUnique({
                where: { id: dto.accountId },
                include: { portfolio: true }
            });

            if (!account) throw new NotFoundException('Account not found');
            if (Number(account.balance) < dto.amount) {
                throw new BadRequestException('Insufficient funds in account');
            }

            // 2. Deduct from account balance
            await tx.account.update({
                where: { id: dto.accountId },
                data: { balance: { decrement: dto.amount } }
            });

            // 3. Work with investment
            const bu = await tx.businessUnit.findUnique({ where: { id: dto.businessUnitId } });
            if (!bu) throw new NotFoundException('Business unit not found');

            // Look for existing active investment for this portfolio
            let investment = await tx.investment.findFirst({
                where: {
                    portfolioId: account.portfolioId,
                    businessUnitId: dto.businessUnitId,
                    status: InvestmentStatus.ACTIVE
                }
            });

            if (investment) {
                // Update existing investment
                investment = await tx.investment.update({
                    where: { id: investment.id },
                    data: { amount: { increment: dto.amount } }
                });
            } else {
                // Create new investment
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

            // 4. Create journal entry
            return await tx.journalEntry.create({
                data: {
                    amount: dto.amount,
                    accountId: dto.accountId,
                    businessUnitId: dto.businessUnitId,
                    investmentId: investment.id,
                    transactionId: transactionId,
                    type: TransactionType.INVEST,
                    description: dto.description || `Investment in ${bu.name}`,
                }
            });
        });
    }

    // ========== ADMINISTRATION FUNCTIONS ==========

    // Get all transactions, with optional filtering by type
    async findAll() {
        return await this.prisma.journalEntry.findMany({
            include: {
                account: { include: { portfolio: { include: { user: true } } } },
                businessUnit: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    // Search transactions by type (INVEST, DEPOSIT, TRANSFER, WITHDRAW, DIVEST)
    async findByType(type: string) {
        return await this.prisma.journalEntry.findMany({
            where: { type: type as any },
            include: { account: true, businessUnit: true },
        });
    }

    // Get transaction history for a specific account
    // Ordered by date (newest first)
    async getAccountHistory(accountId: number) {
        return await this.prisma.journalEntry.findMany({
            where: { accountId },
            include: {
                businessUnit: {
                    select: { name: true }
                }
            },
            orderBy: { createdAt: 'desc' },
        });
    }
}
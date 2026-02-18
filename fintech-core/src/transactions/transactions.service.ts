import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma-service/prisma.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TransactionsService {
    constructor(private prisma: PrismaService) { }


    async createTransfer(fromAccountId: number, toAccountId: number, amount: number, description?: string) {
        if (fromAccountId === toAccountId) {
            throw new BadRequestException('Source and destination accounts must be different');
        }

        const transactionId = uuidv4();

        // One single DB transaction for all 4 operations
        return await this.prisma.$transaction(async (tx) => {
            // 1. Verify and Update Sender (Decrement)
            const sender = await tx.account.update({
                where: { id: fromAccountId },
                data: { balance: { decrement: amount } }
            });

            if (Number(sender.balance) < 0) {
                throw new BadRequestException('Insufficient funds');
            }

            // 2. Update Recipient (Increment)
            await tx.account.update({
                where: { id: toAccountId },
                data: { balance: { increment: amount } }
            });

            // 3. Create Journal Entries (Double-Entry Bookkeeping)
            await tx.journalEntry.createMany({
                data: [
                    {
                        amount: -amount,
                        accountId: fromAccountId,
                        transactionId,
                        type: 'TRANSFER',
                        description: description || `Transfer to account #${toAccountId}`,
                    },
                    {
                        amount: amount,
                        accountId: toAccountId,
                        transactionId,
                        type: 'TRANSFER',
                        description: description || `Transfer from account #${fromAccountId}`,
                    }
                ]
            });

            return { transactionId, status: 'SUCCESS' };
        });
    }


    // 💰 DEPOSIT: Поповнення балансу (тільки адмін у майбутньому)
    async deposit(accountId: number, amount: number, description?: string) {
        const transactionId = uuidv4();
        return await this.prisma.$transaction(async (tx) => {
            const account = await tx.account.update({
                where: { id: accountId },
                data: { balance: { increment: amount } }
            });

            await tx.journalEntry.create({
                data: {
                    amount: amount,
                    accountId,
                    transactionId,
                    type: 'DEPOSIT',
                    description: description || 'Account deposit',
                }
            });
            return { transactionId, newBalance: account.balance, status: 'SUCCESS' };
        });
    }

    // 💸 WITHDRAW: Виведення коштів
    async withdraw(accountId: number, amount: number, description?: string) {
        const transactionId = uuidv4();
        return await this.prisma.$transaction(async (tx) => {
            const account = await tx.account.findUnique({ where: { id: accountId } });
            // 1. Перевірка: чи існує акаунт взагалі?
            if (!account) {
                throw new BadRequestException('Account not found');
            }

            // 2. Тепер TS знає, що 'account' не null, і дозволяє доступ до balance
            if (Number(account.balance) < amount) {
                throw new BadRequestException('Insufficient funds');
            }

            const updatedAccount = await tx.account.update({
                where: { id: accountId },
                data: { balance: { decrement: amount } }
            });

            await tx.journalEntry.create({
                data: {
                    amount: -amount,
                    accountId,
                    transactionId,
                    type: 'WITHDRAW',
                    description: description || 'Funds withdrawal',
                }
            });
            return { transactionId, newBalance: updatedAccount.balance, status: 'SUCCESS' };
        });
    }

    // 📈 INVEST: Інвестиція в бізнес-юніт
    async invest(accountId: number, businessUnitId: number, amount: number, description?: string) {
        const transactionId = uuidv4();
        return await this.prisma.$transaction(async (tx) => {
            // Перевіряємо баланс
            const account = await tx.account.findUnique({ where: { id: accountId } });
            // Перевірка на null: якщо акаунт не знайдено, викидаємо помилку
            if (!account) {
                throw new NotFoundException(`Account with ID ${accountId} not found`);
            }

            // Тепер TypeScript знає, що account точно існує
            if (Number(account.balance) < amount) {
                throw new BadRequestException('Insufficient funds for investment');
            }

            // 2. Перевіряємо чи існує бізнес-юніт
            const businessUnit = await tx.businessUnit.findUnique({ where: { id: businessUnitId } });
            if (!businessUnit) {
                throw new NotFoundException(`Business Unit with ID ${businessUnitId} not found`);
            }
            // 1. Списуємо кошти з акаунта
            const updatedAccount = await tx.account.update({
                where: { id: accountId },
                data: { balance: { decrement: amount } }
            });

            // 2. Створюємо запис у JournalEntry із прив'язкою до BusinessUnit
            await tx.journalEntry.create({
                data: {
                    amount: -amount,
                    accountId,
                    businessUnitId, // Зв'язуємо з бізнесом!
                    transactionId,
                    type: 'INVEST',
                    description: description || `Investment in ${businessUnit.name}`,
                }
            });

            return { transactionId, status: 'INVESTED', businessUnit: businessUnit.name };
        });
    }


    // This is the method the Controller was missing
    async getAccountHistory(accountId: number) {
        const entries = await this.prisma.journalEntry.findMany({
            where: { accountId },
            include: {
                account: {
                    include: {
                        Portfolio: { // Note: match your Prisma schema casing (portfolio vs Portfolio)
                            include: { user: true }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
        });

        // Map through to find the "other side" of the transaction
        return await Promise.all(
            entries.map(async (entry) => {
                const counterpartyEntry = await this.prisma.journalEntry.findFirst({
                    where: {
                        transactionId: entry.transactionId,
                        NOT: { id: entry.id },
                    },
                    include: {
                        account: true
                    }
                });

                return {
                    ...entry,
                    counterpartyAccount: counterpartyEntry?.account?.name || 'External/System',
                    type: entry.type,
                };
            })
        );
    }


    // Get details of a specific transaction by its ID (UUID)
    async getTransactionDetails(transactionId: string) {
        return await this.prisma.journalEntry.findMany({
            where: { transactionId },
            include: {
                account: true,
            },
        });
    }

}

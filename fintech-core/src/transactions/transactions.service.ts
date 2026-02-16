import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma-service/prisma.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TransactionsService {
    constructor(private prisma: PrismaService) { }


    async createTransfer(fromAccountId: number, toAccountId: number, amount: number, description?: string) {
        // Check if the user is trying to transfer money to himself
        if (fromAccountId === toAccountId) {
            throw new BadRequestException('Source and destination accounts must be different');
        }
        // Transaction ID (UUID)
        const transactionId = uuidv4();

        // transaction launch Prisma 
        return await this.prisma.$transaction(async (tx) => {

            // Check the sender's balance
            const fromAccount = await tx.account.findUnique({ where: { id: fromAccountId } });
            if (!fromAccount || Number(fromAccount.balance) < amount) {
                throw new BadRequestException('Insufficient funds or account not found');
            }

            // Creating Double-entry records 
            // "Minus" entry
            const debitEntry = await tx.journalEntry.create({
                data: {
                    amount: -amount, 
                    accountId: fromAccountId,
                    transactionId: transactionId,
                    description: description || 'Transfer Out',
                },
            });

            // "Plus" entry
            const creditEntry = await tx.journalEntry.create({
                data: {
                    amount: amount, 
                    accountId: toAccountId,
                    transactionId: transactionId,
                    description: description || 'Transfer In',
                },
            });

            // Adjusting balances in the Account table

            // Minus from sender
            await tx.account.update({
                where: { id: fromAccountId },
                data: { balance: { decrement: amount } },
            });

            // Pluss to recipient
            await tx.account.update({
                where: { id: toAccountId },
                data: { balance: { increment: amount } },
            });

            // Return the result of the transaction
            return {
                transactionId,
                fromAccountId,
                toAccountId,
                amount,
                status: 'SUCCESS',
            };
        });
    }

    async getAccountHistory(accountId: number) {
        return await this.prisma.journalEntry.findMany({
            where: { accountId },
            orderBy: { createdAt: 'desc' }, // Sort recent transactions
        });
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

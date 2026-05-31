import { database } from '../index';
import Expense from '../models/Expense';
import { enqueueSyncOperation } from './sync-queue.repository';

export async function addExpense(amount: number, description: string, currency = 'USD') {
  await database.write(async () => {
    const expense = await database.get<Expense>('expenses').create((record) => {
      record.amount = amount;
      record.description = description;
      record.currency = currency;
      record.incurredAt = new Date();
    });

    await enqueueSyncOperation({
      tableName: 'expenses',
      recordId: expense.id,
      operation: 'INSERT',
      payload: { amount, description, currency, incurredAt: expense.incurredAt.getTime() },
    });
  });
}

export function observeExpenses() {
  return database.get<Expense>('expenses').query().observe();
}

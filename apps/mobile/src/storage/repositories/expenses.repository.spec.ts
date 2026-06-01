import { addExpense } from './expenses.repository';
import { database } from '../index';
import Expense from '../models/Expense';

describe('expenses.repository', () => {
  beforeEach(async () => {
    await database.write(async () => {
      await database.get('expenses').query().destroyAllPermanently();
      await database.get('sync_queue').query().destroyAllPermanently();
    });
  });

  describe('addExpense', () => {
    it('creates expense with default currency (BAM)', async () => {
      await addExpense(100, 'Test Description');

      const expenses = await database.get<Expense>('expenses').query().fetch();
      expect(expenses.length).toBe(1);
      expect(expenses[0].amount).toBe(100);
      expect(expenses[0].currency).toBe('BAM');
    });

    it('creates expense with custom currency', async () => {
      await addExpense(200, 'Tolls', 'EUR');

      const expenses = await database.get<Expense>('expenses').query().fetch();
      expect(expenses.length).toBe(1);
      expect(expenses[0].amount).toBe(200);
      expect(expenses[0].currency).toBe('EUR');
    });
  });
});

import {
  fetchAnalyticsEarnings,
  fetchAnalyticsExpenses,
  fetchAnalyticsProfitability,
  fetchAnalyticsSummary,
} from './analytics-api.service';

const fetchMock = global.fetch as jest.Mock;

describe('analytics-api.service', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('fetches analytics summary with auth headers', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ jobsTotal: 42, completionRate: 75 }),
    });

    await expect(fetchAnalyticsSummary('token-123')).resolves.toEqual({
      jobsTotal: 42,
      completionRate: 75,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/api/analytics/summary',
      {
        method: 'GET',
        headers: {
          Authorization: 'Bearer token-123',
          'Content-Type': 'application/json',
        },
      }
    );
  });

  it('returns empty summary when the summary endpoint fails', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });

    await expect(fetchAnalyticsSummary('token-123')).resolves.toEqual({});
  });

  it.each([
    ['earnings', fetchAnalyticsEarnings, '/analytics/earnings'],
    ['expenses', fetchAnalyticsExpenses, '/analytics/expenses'],
    ['profitability', fetchAnalyticsProfitability, '/analytics/profitability'],
  ])('fetches %s monthly metrics', async (_name, fetcher, path) => {
    const metrics = [{ month: 'May', jobs: 9, revenue: 12 }];
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => metrics });

    await expect(fetcher('token-123')).resolves.toEqual(metrics);
    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.example.com/api${path}`,
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer token-123',
        }),
      })
    );
  });

  it('returns an empty monthly list when a monthly endpoint fails', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'));

    await expect(fetchAnalyticsEarnings('token-123')).resolves.toEqual([]);
  });
});

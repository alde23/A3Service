import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

import AnalyticsScreen from './analytics';
import { useAuth } from '../services/auth.service';
import {
  fetchAnalyticsEarnings,
  fetchAnalyticsSummary,
} from '../services/analytics-api.service';

jest.mock('../services/auth.service', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../services/analytics-api.service', () => ({
  fetchAnalyticsSummary: jest.fn(),
  fetchAnalyticsEarnings: jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: string | number }) => {
      const translations: Record<string, string> = {
        'analytics.title': 'Analytics',
        'analytics.header_copy':
          'Track the numbers behind jobs, fault patterns, and service demand.',
        'analytics.export': 'Export',
        'analytics.year_to_date': 'Year-to-date volume',
        'analytics.jobs_count': `${options?.count ?? 0} jobs`,
      };
      return translations[key] ?? key;
    },
  }),
}));

const useAuthMock = useAuth as jest.Mock;
const fetchSummaryMock = fetchAnalyticsSummary as jest.Mock;
const fetchEarningsMock = fetchAnalyticsEarnings as jest.Mock;

describe('AnalyticsScreen backend integration', () => {
  beforeEach(() => {
    useAuthMock.mockReturnValue({ token: 'token-123' });
    fetchSummaryMock.mockResolvedValue({
      jobsTotal: 87,
      completionRate: 98.2,
      faultRepeatRate: 5.25,
      avgResponseTime: 27,
    });
    fetchEarningsMock.mockResolvedValue([
      { month: 'Mar', jobs: 4, revenue: 10 },
      { month: 'Apr', jobs: 8, revenue: 20 },
    ]);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('fetches analytics summary and earnings with the auth token', async () => {
    render(<AnalyticsScreen />);

    await waitFor(() => {
      expect(fetchSummaryMock).toHaveBeenCalledWith('token-123');
      expect(fetchEarningsMock).toHaveBeenCalledWith('token-123');
    });
  });

  it('renders API metrics and monthly earning data', async () => {
    const screen = render(<AnalyticsScreen />);

    expect(await screen.findByText('87')).toBeTruthy();
    expect(screen.getByText('98%')).toBeTruthy();
    expect(screen.getByText('5.3%')).toBeTruthy();
    expect(screen.getByText('27m')).toBeTruthy();
    expect(screen.getByText('12 jobs')).toBeTruthy();
    expect(screen.getAllByText('Apr').length).toBeGreaterThan(0);
  });

  it('keeps fallback metrics when analytics calls fail', async () => {
    fetchSummaryMock.mockRejectedValueOnce(new Error('network down'));

    const screen = render(<AnalyticsScreen />);

    expect(await screen.findByText('72%')).toBeTruthy();
    expect(screen.getByText('8.4%')).toBeTruthy();
    expect(screen.getByText('34m')).toBeTruthy();
  });

  it('does not call analytics endpoints without an auth token', () => {
    useAuthMock.mockReturnValue({ token: null });

    render(<AnalyticsScreen />);

    expect(fetchSummaryMock).not.toHaveBeenCalled();
    expect(fetchEarningsMock).not.toHaveBeenCalled();
  });
});

import { authJsonHeaders, API_URL } from './api.config';

export type AnalyticsSummary = {
  jobsTotal?: number;
  jobsThisMonth?: number;
  completionRate?: number;
  avgResponseTime?: number;
  faultRepeatRate?: number;
  revenueTotal?: number;
  profitabilityIndex?: number;
};

export type MonthlyMetric = {
  month: string;
  jobs: number;
  revenue: number;
};

export async function fetchAnalyticsSummary(
  token: string
): Promise<AnalyticsSummary> {
  try {
    const res = await fetch(`${API_URL}/analytics/summary`, {
      method: 'GET',
      headers: authJsonHeaders(token),
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch analytics summary (${res.status})`);
    }

    return await res.json();
  } catch (error) {
    console.error('Analytics summary fetch error:', error);
    return {};
  }
}

export async function fetchAnalyticsEarnings(
  token: string
): Promise<MonthlyMetric[]> {
  try {
    const res = await fetch(`${API_URL}/analytics/earnings`, {
      method: 'GET',
      headers: authJsonHeaders(token),
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch analytics earnings (${res.status})`);
    }

    return await res.json();
  } catch (error) {
    console.error('Analytics earnings fetch error:', error);
    return [];
  }
}

export async function fetchAnalyticsExpenses(
  token: string
): Promise<MonthlyMetric[]> {
  try {
    const res = await fetch(`${API_URL}/analytics/expenses`, {
      method: 'GET',
      headers: authJsonHeaders(token),
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch analytics expenses (${res.status})`);
    }

    return await res.json();
  } catch (error) {
    console.error('Analytics expenses fetch error:', error);
    return [];
  }
}

export async function fetchAnalyticsProfitability(
  token: string
): Promise<MonthlyMetric[]> {
  try {
    const res = await fetch(`${API_URL}/analytics/profitability`, {
      method: 'GET',
      headers: authJsonHeaders(token),
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch analytics profitability (${res.status})`);
    }

    return await res.json();
  } catch (error) {
    console.error('Analytics profitability fetch error:', error);
    return [];
  }
}

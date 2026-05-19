import type { AnalyticsPeriod } from './analytics-query.dto';

export type AnalyticsPeriodMeta = {
  period: AnalyticsPeriod;
  bucket: 'day' | 'week' | 'month';
  start: string;
  end: string;
};

export type AnalyticsSeriesPoint = {
  periodStart: string;
  periodEnd: string;
  value: string;
};

export type AnalyticsSeriesResponse = {
  period: AnalyticsPeriodMeta;
  total: string;
  items: AnalyticsSeriesPoint[];
};

export type AnalyticsSummaryResponse = {
  period: AnalyticsPeriodMeta;
  totals: {
    earnings: string;
    expenses: string;
    profit: string;
  };
};

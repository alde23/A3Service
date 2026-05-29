export type AnalyticsPeriod = 'day' | 'week' | 'month' | 'custom';

export type AnalyticsQueryDto = {
  period?: AnalyticsPeriod;
  start?: string;
  end?: string;
};

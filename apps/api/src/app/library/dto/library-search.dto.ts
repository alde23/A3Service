export type LibrarySearchQueryDto = {
  q?: string;
  model?: string;
  manufacturer?: string;
  faultCode?: string;
  part?: string;
  page?: number;
  pageSize?: number;
};

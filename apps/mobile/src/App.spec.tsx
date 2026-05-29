import * as React from 'react';
import { render } from '@testing-library/react-native';

import App from './app';
import { useAuth } from './services/auth.service';

jest.mock('./services/auth.service', () => ({
  useAuth: jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) => {
      const translations: Record<string, string> = {
        'home.title': 'Home',
        'home.jobs_visible': `${options?.count ?? 0} jobs visible on map`,
        'map.you': 'You',
        'map.current_location': 'Current location',
        'unit.mi': 'mi',
        'status.active': 'Active',
        'status.upcoming': 'Upcoming',
      };
      return translations[key] ?? key;
    },
  }),
}));

test('renders correctly', () => {
  (useAuth as jest.Mock).mockReturnValue({ token: null });
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);

  const { getByText } = render(<App />);
  expect(getByText('Home')).toBeTruthy();

  jest.restoreAllMocks();
});

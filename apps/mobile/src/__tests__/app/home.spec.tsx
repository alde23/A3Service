import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

import HomeScreen from '../../app/home';
import { useAuth } from '../../services/auth.service';

jest.mock('../../services/auth.service', () => ({
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

const fetchMock = global.fetch as jest.Mock;
const useAuthMock = useAuth as jest.Mock;

describe('HomeScreen backend integration', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    useAuthMock.mockReturnValue({ token: 'token-123' });
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('fetches jobs from the shared API URL and renders live jobs on the map summary', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          id: 'job-1',
          siteId: 'site-1',
          rawAddress: 'Live Customer Site',
          status: 'IN_PROGRESS',
        },
        {
          id: 'job-2',
          siteId: null,
          rawAddress: 'Missing Site',
          status: 'SCHEDULED',
        },
      ],
    });

    const screen = render(<HomeScreen />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.example.com/api/jobs',
        {
          method: 'GET',
          headers: {
            Authorization: 'Bearer token-123',
            'Content-Type': 'application/json',
          },
        }
      );
    });

    expect(await screen.findByText('Live Customer Site')).toBeTruthy();
    expect(screen.getByText('1 jobs visible on map')).toBeTruthy();
  });

  it('keeps mock jobs visible when the jobs API fails', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'));

    const screen = render(<HomeScreen />);

    expect(await screen.findByText('Brooklyn Public Library')).toBeTruthy();
    expect(screen.getByText('3 jobs visible on map')).toBeTruthy();
  });

  it('does not call the jobs endpoint without an auth token', () => {
    useAuthMock.mockReturnValue({ token: null });

    render(<HomeScreen />);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import DocumentationScreen from '../../app/documentation';
import { useAuth } from '../../services/auth.service';
import { searchLibrary } from '../../services/library-api.service';

jest.mock('../../services/auth.service', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../services/library-api.service', () => ({
  searchLibrary: jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'documentation.title': 'Documentation',
        'documentation.header_copy':
          'Search fault codes, boiler types, brands, and quick fixes.',
        'documentation.search_placeholder':
          'Search fault code, keyword, boiler or brand',
        'documentation.search': 'Search',
        'documentation.popular_references': 'Popular References',
        'documentation.search_results': 'Search Results',
        'documentation.top_topics': 'Top topics',
        'documentation.hero_title':
          'Fast access to the most used field references.',
      };
      return translations[key] ?? key;
    },
  }),
}));

const useAuthMock = useAuth as jest.Mock;
const searchLibraryMock = searchLibrary as jest.Mock;

describe('DocumentationScreen backend integration', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    useAuthMock.mockReturnValue({ token: 'token-123' });
    searchLibraryMock.mockResolvedValue([
      {
        id: 'fault-f22',
        title: 'API Fault Code F22',
        category: 'Vaillant',
        type: 'fault',
        description: 'Low pressure from API',
      },
    ]);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('filters local documentation before API search is requested', () => {
    const screen = render(<DocumentationScreen />);

    fireEvent.changeText(
      screen.getByPlaceholderText('Search fault code, keyword, boiler or brand'),
      'F28'
    );

    expect(screen.getByText('Fault Code F28')).toBeTruthy();
    expect(screen.queryByText('Fault Code F22')).toBeNull();
    expect(searchLibraryMock).not.toHaveBeenCalled();
  });

  it('runs debounced API search from the Search button and renders API results', async () => {
    const screen = render(<DocumentationScreen />);

    fireEvent.changeText(
      screen.getByPlaceholderText('Search fault code, keyword, boiler or brand'),
      'F22'
    );
    fireEvent.press(screen.getByText('Search'));

    act(() => {
      jest.advanceTimersByTime(299);
    });
    expect(searchLibraryMock).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(1);
    });

    await waitFor(() => {
      expect(searchLibraryMock).toHaveBeenCalledWith('token-123', 'F22');
    });
    expect(await screen.findByText('API Fault Code F22')).toBeTruthy();
    expect(screen.getByText('Low pressure from API')).toBeTruthy();
  });

  it('falls back to local results when API search fails', async () => {
    searchLibraryMock.mockRejectedValueOnce(new Error('network down'));
    const screen = render(<DocumentationScreen />);

    fireEvent.changeText(
      screen.getByPlaceholderText('Search fault code, keyword, boiler or brand'),
      'F22'
    );
    fireEvent.press(screen.getByText('Search'));

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(await screen.findByText('Fault Code F22')).toBeTruthy();
  });

  it('does not call API search without an auth token', () => {
    useAuthMock.mockReturnValue({ token: null });
    const screen = render(<DocumentationScreen />);

    fireEvent.changeText(
      screen.getByPlaceholderText('Search fault code, keyword, boiler or brand'),
      'F22'
    );
    fireEvent.press(screen.getByText('Search'));
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(searchLibraryMock).not.toHaveBeenCalled();
  });
});

import {
  fetchFaultDetails,
  fetchLibraryModelDetails,
  fetchLibraryModels,
  searchLibrary,
} from './library-api.service';

const fetchMock = global.fetch as jest.Mock;

describe('library-api.service', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('searches the library with an encoded query and auth headers', async () => {
    const results = [
      {
        id: 'fault-f22',
        title: 'Fault Code F22',
        category: 'Fault Codes',
        type: 'fault',
      },
    ];
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => results });

    await expect(searchLibrary('token-123', 'Vaillant F22')).resolves.toEqual(
      results
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/api/library/search?q=Vaillant%20F22',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer token-123',
        }),
      })
    );
  });

  it('returns an empty search result list when search fails', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 400 });

    await expect(searchLibrary('token-123', 'F22')).resolves.toEqual([]);
  });

  it('fetches model lists and details', async () => {
    const models = [
      {
        id: 'model-1',
        name: 'ecoTEC Plus',
        brand: 'Vaillant',
        category: 'Boiler',
      },
    ];
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => models })
      .mockResolvedValueOnce({ ok: true, json: async () => models[0] });

    await expect(fetchLibraryModels('token-123')).resolves.toEqual(models);
    await expect(fetchLibraryModelDetails('token-123', 'model-1')).resolves.toEqual(
      models[0]
    );

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://api.example.com/api/library/models',
      expect.any(Object)
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://api.example.com/api/library/models/model-1',
      expect.any(Object)
    );
  });

  it('fetches fault details and returns null when details fail', async () => {
    const fault = {
      code: 'F22',
      title: 'Low pressure',
      description: 'Low water pressure.',
    };
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => fault })
      .mockRejectedValueOnce(new Error('network down'));

    await expect(fetchFaultDetails('token-123', 'F22')).resolves.toEqual(fault);
    await expect(fetchFaultDetails('token-123', 'F28')).resolves.toBeNull();
  });
});

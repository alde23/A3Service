import { authJsonHeaders, API_URL } from './api.config';

export type LibraryModel = {
  id: string;
  name: string;
  brand: string;
  category: string;
  description?: string;
};

export type LibraryFault = {
  code: string;
  title: string;
  description: string;
  solutions?: string[];
};

export type LibrarySearchResult = {
  id: string;
  title: string;
  category: string;
  type: 'model' | 'fault' | 'guide';
  description?: string;
};

export async function searchLibrary(
  token: string,
  query: string
): Promise<LibrarySearchResult[]> {
  try {
    const res = await fetch(`${API_URL}/library/search?q=${encodeURIComponent(query)}`, {
      method: 'GET',
      headers: authJsonHeaders(token),
    });

    if (!res.ok) {
      throw new Error(`Failed to search library (${res.status})`);
    }

    return await res.json();
  } catch (error) {
    console.error('Library search error:', error);
    return [];
  }
}

export async function fetchLibraryModels(
  token: string
): Promise<LibraryModel[]> {
  try {
    const res = await fetch(`${API_URL}/library/models`, {
      method: 'GET',
      headers: authJsonHeaders(token),
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch library models (${res.status})`);
    }

    return await res.json();
  } catch (error) {
    console.error('Library models fetch error:', error);
    return [];
  }
}

export async function fetchLibraryModelDetails(
  token: string,
  modelId: string
): Promise<LibraryModel | null> {
  try {
    const res = await fetch(`${API_URL}/library/models/${modelId}`, {
      method: 'GET',
      headers: authJsonHeaders(token),
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch model details (${res.status})`);
    }

    return await res.json();
  } catch (error) {
    console.error('Library model details fetch error:', error);
    return null;
  }
}

export async function fetchFaultDetails(
  token: string,
  faultCode: string
): Promise<LibraryFault | null> {
  try {
    const res = await fetch(`${API_URL}/library/faults/${faultCode}`, {
      method: 'GET',
      headers: authJsonHeaders(token),
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch fault details (${res.status})`);
    }

    return await res.json();
  } catch (error) {
    console.error('Library fault details fetch error:', error);
    return null;
  }
}

import { authJsonHeaders, API_URL } from './api.config';

export type LibraryPartDetail = {
  id: string;
  sku: string;
  name: string;
  brand?: string;
  unitPrice?: number;
  inventoryStatus?: string;
};

export type LibraryFault = {
  id: string;
  code: string;
  description: string;
  possibleCauses?: string[];
  symptoms?: string[];
  severity?: string;
  model?: { id: string; modelName: string; manufacturerId: string };
};

export type LibraryModel = {
  id: string;
  name: string;
  brand: string;
  category: string;
  description?: string;
  faultCodes?: LibraryFault[];
  modelParts?: { part: LibraryPartDetail }[];
  technicalSpecs?: any[];
  statusCodes?: any[];
  diagnosticCodes?: any[];
  safetyWarnings?: any[];
  maintenanceTasks?: any[];
};

export type LibrarySearchResult = {
  id: string;
  title: string;
  category: string;
  type: 'model' | 'fault' | 'part';
  description?: string;
};

export async function searchLibrary(
  token: string,
  query: string,
  type?: string,
  manufacturer?: string,
  page = 1
): Promise<LibrarySearchResult[]> {
  try {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (type) params.append('type', type);
    if (manufacturer) params.append('manufacturer', manufacturer);
    if (page > 1) params.append('page', page.toString());

    const res = await fetch(`${API_URL}/library/search?${params.toString()}`, {
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

export async function fetchManufacturers(
  token: string
): Promise<string[]> {
  try {
    const res = await fetch(`${API_URL}/library/manufacturers`, {
      method: 'GET',
      headers: authJsonHeaders(token),
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch manufacturers (${res.status})`);
    }

    return await res.json();
  } catch (error) {
    console.error('Library manufacturers fetch error:', error);
    return [];
  }
}

export async function fetchLibraryModels(
  token: string,
  page = 1
): Promise<LibraryModel[]> {
  try {
    const params = new URLSearchParams();
    if (page > 1) params.append('page', page.toString());

    const res = await fetch(`${API_URL}/library/models?${params.toString()}`, {
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

export async function fetchFaultDetailsById(
  token: string,
  id: string
): Promise<LibraryFault | null> {
  try {
    const res = await fetch(`${API_URL}/library/faults/${id}`, {
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

export async function fetchPartDetails(
  token: string,
  id: string
): Promise<LibraryPartDetail | null> {
  try {
    const res = await fetch(`${API_URL}/library/parts/${id}`, {
      method: 'GET',
      headers: authJsonHeaders(token),
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch part details (${res.status})`);
    }

    return await res.json();
  } catch (error) {
    console.error('Library part details fetch error:', error);
    return null;
  }
}

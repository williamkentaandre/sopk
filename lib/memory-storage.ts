// Temporary in-memory storage to bypass DynamoDB issues
// This is a temporary solution until DynamoDB is fixed

interface Settings {
  hl: string;
  gl: string;
}

interface Pair {
  pair_id: string;
  keyword: string;
  url: string;
  last_position: number | null;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
}

// In-memory storage
let memorySettings: Settings = { hl: 'fr', gl: 'fr' };
let memoryPairs: Pair[] = [];

export const memoryStorage = {
  // Settings
  getSettings: (): Settings => {
    return { ...memorySettings };
  },

  updateSettings: (settings: Settings): Settings => {
    memorySettings = { ...settings };
    return { ...memorySettings };
  },

  // Pairs
  getPairs: (): Pair[] => {
    return [...memoryPairs];
  },

  createPair: (keyword: string, url: string): Pair => {
    const pair: Pair = {
      pair_id: `pair_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      keyword,
      url,
      last_position: null,
      last_checked_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    memoryPairs.push(pair);
    return { ...pair };
  },

  updatePair: (pairId: string, updates: Partial<Pick<Pair, 'keyword' | 'url' | 'last_position' | 'last_checked_at'>>): Pair | null => {
    const index = memoryPairs.findIndex(p => p.pair_id === pairId);
    if (index === -1) return null;

    memoryPairs[index] = {
      ...memoryPairs[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    return { ...memoryPairs[index] };
  },

  deletePair: (pairId: string): boolean => {
    const index = memoryPairs.findIndex(p => p.pair_id === pairId);
    if (index === -1) return false;

    memoryPairs.splice(index, 1);
    return true;
  },

  // Debug info
  getDebugInfo: () => {
    return {
      settings: memorySettings,
      pairsCount: memoryPairs.length,
      pairs: memoryPairs,
    };
  }
};

// Simple in-memory storage for pairs
export interface SimplePair {
  pair_id: string;
  keyword: string;
  url: string;
  last_position: number | null;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
}

let pairs: SimplePair[] = [];

export const simpleStorage = {
  // Get all pairs
  getAllPairs: (): SimplePair[] => {
    return [...pairs];
  },

  // Add new pairs
  addPairs: (newPairs: { keyword: string; url: string }[]): SimplePair[] => {
    const now = new Date().toISOString();
    const addedPairs: SimplePair[] = newPairs.map(pair => ({
      pair_id: `pair_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      keyword: pair.keyword,
      url: pair.url,
      last_position: null,
      last_checked_at: null,
      created_at: now,
      updated_at: now,
    }));

    pairs = [...addedPairs, ...pairs];
    return addedPairs;
  },

  // Update pair
  updatePair: (pairId: string, updates: Partial<Pick<SimplePair, 'keyword' | 'url' | 'last_position' | 'last_checked_at'>>): SimplePair | null => {
    const index = pairs.findIndex(p => p.pair_id === pairId);
    if (index === -1) return null;

    pairs[index] = {
      ...pairs[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    return { ...pairs[index] };
  },

  // Delete pair
  deletePair: (pairId: string): boolean => {
    const index = pairs.findIndex(p => p.pair_id === pairId);
    if (index === -1) return false;

    pairs.splice(index, 1);
    return true;
  },

  // Get pair by ID
  getPair: (pairId: string): SimplePair | null => {
    return pairs.find(p => p.pair_id === pairId) || null;
  }
};

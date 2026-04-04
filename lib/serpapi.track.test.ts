import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./serper', () => ({
  callSerperGoogleSearch: vi.fn(),
}));

import { trackKeyword } from './serpapi';
import { callSerperGoogleSearch } from './serper';

const mocked = vi.mocked(callSerperGoogleSearch);

describe('trackKeyword / fetchSerperOrganicUpTo100', () => {
  beforeEach(() => {
    mocked.mockReset();
  });

  it('uses a single num=100 call when Serper returns more than 10 organics', async () => {
    const organic = Array.from({ length: 50 }, (_, i) => ({
      title: `t${i}`,
      link: `https://example.com/p${i}`,
    }));
    mocked.mockResolvedValueOnce({ organic });

    const r = await trackKeyword('kw', 'https://example.com/p24', 'fr', 'fr', {
      apiKey: 'test-key',
    });

    expect(mocked).toHaveBeenCalledTimes(1);
    expect(mocked.mock.calls[0]![0]).toMatchObject({
      q: 'kw',
      hl: 'fr',
      gl: 'fr',
      num: 100,
      page: 1,
    });
    expect(r.position).toBe(25);
  });

  it('paginates with num=10 when the first response has at most 10 organics', async () => {
    const page1 = Array.from({ length: 10 }, (_, i) => ({
      title: `t${i}`,
      link: `https://a.com/${i}`,
    }));
    const page2 = Array.from({ length: 10 }, (_, i) => ({
      title: `t${i + 10}`,
      link: `https://a.com/${i + 10}`,
    }));
    mocked
      .mockResolvedValueOnce({ organic: page1 })
      .mockResolvedValueOnce({ organic: page2 })
      .mockResolvedValue({ organic: [] });

    const r = await trackKeyword('kw', 'https://a.com/15', 'fr', 'fr', {
      apiKey: 'test-key',
    });

    expect(mocked).toHaveBeenCalledTimes(3);
    expect(mocked.mock.calls[0]![0]).toMatchObject({ num: 100, page: 1 });
    expect(mocked.mock.calls[1]![0]).toMatchObject({ num: 10, page: 2 });
    expect(mocked.mock.calls[2]![0]).toMatchObject({ num: 10, page: 3 });
    expect(r.position).toBe(16);
  });

  it('continues with page=2 when the first batch has only 9 organics', async () => {
    const batch9 = Array.from({ length: 9 }, (_, i) => ({
      title: `t${i}`,
      link: `https://b.com/${i}`,
    }));
    const batchNext = [{ title: 't9', link: 'https://b.com/9' }];
    mocked
      .mockResolvedValueOnce({ organic: batch9 })
      .mockResolvedValueOnce({ organic: batchNext })
      .mockResolvedValue({ organic: [] });

    const r = await trackKeyword('kw', 'https://b.com/9', 'fr', 'fr', {
      apiKey: 'test-key',
    });

    expect(mocked.mock.calls[1]![0]).toMatchObject({ num: 10, page: 2 });
    expect(r.position).toBe(10);
  });

  it('retries with num=10 page=1 when num=100 fails', async () => {
    mocked
      .mockRejectedValueOnce(new Error('unsupported'))
      .mockResolvedValueOnce({
        organic: [{ title: 'a', link: 'https://x.com/1' }],
      })
      .mockResolvedValue({ organic: [] });

    const r = await trackKeyword('kw', 'https://x.com/1', 'fr', 'fr', {
      apiKey: 'test-key',
    });

    expect(mocked).toHaveBeenCalledTimes(3);
    expect(mocked.mock.calls[0]![0]).toMatchObject({ num: 100, page: 1 });
    expect(mocked.mock.calls[1]![0]).toMatchObject({ num: 10, page: 1 });
    expect(mocked.mock.calls[2]![0]).toMatchObject({ num: 10, page: 2 });
    expect(r.position).toBe(1);
  });
});

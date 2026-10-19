import { describe, expect, it } from 'vitest';
import { resolveOutline, type DestinationResolver, type RawOutlineItem } from './outline';

const ref = (num: number) => ({ num, gen: 0 });

/** Page references resolve to num - 100; named destinations come from `named`. */
function resolver(named: Record<string, unknown[]> = {}): DestinationResolver {
  return {
    getDestination: (name) => Promise.resolve(named[name] ?? null),
    getPageIndex: (pageRef) => {
      const num = (pageRef as { num?: number }).num;
      return typeof num === 'number'
        ? Promise.resolve(num - 100)
        : Promise.reject(new Error('bad ref'));
    },
  };
}

const item = (title: string, dest: RawOutlineItem['dest'], items: RawOutlineItem[] = []) => ({
  title,
  dest,
  url: null,
  items,
});

describe('resolveOutline', () => {
  it('resolves an explicit destination through its page reference', async () => {
    const outline = await resolveOutline(
      [item('Ch 1', [ref(103), { name: 'XYZ' }])],
      resolver(),
      10,
    );
    expect(outline).toEqual([{ title: 'Ch 1', pageIndex: 3, children: [] }]);
  });

  it('accepts a plain page number as the destination page', async () => {
    const outline = await resolveOutline([item('Ch 2', [6, { name: 'Fit' }])], resolver(), 10);
    expect(outline[0]?.pageIndex).toBe(6);
  });

  it('resolves a named destination', async () => {
    const outline = await resolveOutline(
      [item('Ch 3', 'chapter-3')],
      resolver({ 'chapter-3': [ref(108), { name: 'XYZ' }] }),
      12,
    );
    expect(outline[0]?.pageIndex).toBe(8);
  });

  it('gives no page for a named destination that does not exist', async () => {
    const outline = await resolveOutline([item('Gone', 'missing')], resolver(), 12);
    expect(outline[0]?.pageIndex).toBeNull();
  });

  it('gives no page when the page reference cannot be resolved', async () => {
    const outline = await resolveOutline([item('Bad', [{ weird: true }])], resolver(), 12);
    expect(outline[0]?.pageIndex).toBeNull();
  });

  it('gives no page for a destination outside the book', async () => {
    const outline = await resolveOutline([item('Far', [ref(150)])], resolver(), 12);
    expect(outline[0]?.pageIndex).toBeNull();
  });

  it('gives no page for a web link entry', async () => {
    const outline = await resolveOutline(
      [{ title: 'Website', dest: null, url: 'https://example.com', items: [] }],
      resolver(),
      12,
    );
    expect(outline[0]).toEqual({ title: 'Website', pageIndex: null, children: [] });
  });

  it('keeps order and nesting', async () => {
    const outline = await resolveOutline(
      [
        item('Part 1', [ref(100)], [item('Ch 1', [ref(101)]), item('Ch 2', [ref(104)])]),
        item('Appendix', [ref(111)]),
      ],
      resolver(),
      12,
    );
    expect(outline).toEqual([
      {
        title: 'Part 1',
        pageIndex: 0,
        children: [
          { title: 'Ch 1', pageIndex: 1, children: [] },
          { title: 'Ch 2', pageIndex: 4, children: [] },
        ],
      },
      { title: 'Appendix', pageIndex: 11, children: [] },
    ]);
  });

  it('gives untitled entries a readable placeholder', async () => {
    const outline = await resolveOutline([item('   ', [ref(100)])], resolver(), 12);
    expect(outline[0]?.title).toBe('Untitled section');
  });

  it('returns an empty list for a book without an outline', async () => {
    expect(await resolveOutline(null, resolver(), 12)).toEqual([]);
  });
});

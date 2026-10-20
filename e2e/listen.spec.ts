// Phase 16: listen to a book. A stand-in speech engine records what would be spoken (each piece
// "takes" 150 ms), so the tests don't depend on the voices a test browser has.
import { expect, test, type Page } from '@playwright/test';
import { importBook, pageSlot } from './helpers';

declare global {
  interface Window {
    spoken: { text: string; rate: number }[];
    /** How long the stand-in engine "speaks" each piece (default 150 ms). */
    speechMs?: number;
  }
}

function fakeSpeech() {
  window.spoken = [];
  class FakeUtterance {
    text: string;
    rate = 1;
    lang = '';
    onend: ((event: unknown) => void) | null = null;
    onerror: ((event: { error: string }) => void) | null = null;
    constructor(text: string) {
      this.text = text;
    }
  }
  let current: { utterance: FakeUtterance; timer: ReturnType<typeof setTimeout> } | null = null;
  const synth = {
    speak(utterance: FakeUtterance) {
      window.spoken.push({ text: utterance.text, rate: utterance.rate });
      const timer = setTimeout(() => {
        current = null;
        utterance.onend?.({});
      }, window.speechMs ?? 150);
      current = { utterance, timer };
    },
    cancel() {
      if (!current) return;
      clearTimeout(current.timer);
      const { utterance } = current;
      current = null;
      utterance.onerror?.({ error: 'interrupted' });
    },
    pause() {},
    resume() {},
    getVoices: () => [],
  };
  Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
  Object.defineProperty(window, 'SpeechSynthesisUtterance', {
    value: FakeUtterance,
    configurable: true,
  });
}

const spoken = (page: Page) => page.evaluate(() => window.spoken.map((s) => s.text));
const bar = (page: Page) => page.getByRole('toolbar', { name: 'Read aloud' });

test.describe('with speech', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(fakeSpeech);
    await page.goto('/');
    await importBook(page, 'text-4-pages.pdf');
  });

  test('Listen reads from the top of the book, marks the sentence and moves on to the next pages', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Listen', exact: true }).click();
    await expect(bar(page)).toBeVisible();
    await expect
      .poll(async () => (await spoken(page))[0])
      .toBe('Alpha one: the first line of selectable text on page one.');
    await expect(page.locator('[data-page-index="0"] .spoken-hit').first()).toBeVisible();
    // It goes on to page 4 and the view follows.
    await expect
      .poll(async () => (await spoken(page)).some((t) => t.startsWith('Hotel eight')), {
        timeout: 10_000,
      })
      .toBe(true);
    await expect(pageSlot(page, 3)).toBeInViewport();
    // At the end of the book it stops by itself.
    await expect(bar(page)).toHaveCount(0, { timeout: 10_000 });
    await expect(page.locator('.spoken-hit')).toHaveCount(0);
  });

  test('it starts from where I am', async ({ page }) => {
    await pageSlot(page, 1).evaluate((slot: HTMLElement) => {
      const reader = slot.closest<HTMLElement>('[data-testid="reader"]');
      if (reader) reader.scrollTop = slot.offsetTop;
    });
    await expect(pageSlot(page, 1)).toHaveAttribute('data-state', 'rendered');
    await page.getByRole('button', { name: 'Listen', exact: true }).click();
    await expect
      .poll(async () => (await spoken(page))[0])
      .toBe('and Juliet ten finishes it at the top of page two.');
    await expect(bar(page)).toContainText('page 2');
  });

  test('pause keeps the place, resume repeats that sentence and goes on, stop ends it', async ({
    page,
  }) => {
    // Slow pieces, so the short book can't end while the test is still pressing buttons.
    await page.evaluate(() => (window.speechMs = 600));
    await page.getByRole('button', { name: 'Listen', exact: true }).click();
    await expect.poll(async () => (await spoken(page)).length).toBeGreaterThanOrEqual(2);
    await bar(page).getByRole('button', { name: 'Pause' }).click();
    await expect(bar(page)).toContainText('Paused on page');
    const atPause = await spoken(page);
    await page.waitForTimeout(500);
    expect(await spoken(page)).toEqual(atPause);

    await bar(page).getByRole('button', { name: 'Resume' }).click();
    await expect.poll(async () => (await spoken(page)).length).toBeGreaterThan(atPause.length + 1);
    const after = await spoken(page);
    expect(after[atPause.length]).toBe(atPause.at(-1));

    await bar(page).getByRole('button', { name: 'Stop reading' }).click();
    await expect(bar(page)).toHaveCount(0);
    await expect(page.locator('.spoken-hit')).toHaveCount(0);
  });

  test('a new speed applies to what is read next', { tag: '@any-engine' }, async ({ page }) => {
    await page.getByRole('button', { name: 'Listen', exact: true }).click();
    await expect.poll(async () => (await spoken(page)).length).toBeGreaterThanOrEqual(1);
    await bar(page).getByRole('combobox', { name: 'Speed' }).selectOption('1.5');
    await expect.poll(() => page.evaluate(() => window.spoken.at(-1)?.rate)).toBe(1.5);
  });
});

test('without speech in the browser, Listen says so', { tag: '@any-engine' }, async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'speechSynthesis', { value: undefined, configurable: true });
  });
  await page.goto('/');
  await importBook(page, 'text-4-pages.pdf');
  await page.getByRole('button', { name: 'Listen', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText("Listening isn't available in this browser.");
});

test(
  'a book without text says there is nothing to read aloud',
  { tag: '@any-engine' },
  async ({ page }) => {
    await page.addInitScript(fakeSpeech);
    await page.goto('/');
    await importBook(page, 'no-text-1-page.pdf');
    await page.getByRole('button', { name: 'Listen', exact: true }).click();
    await expect(page.getByRole('alert')).toHaveText('There is no text to read aloud from here.');
    await expect(bar(page)).toHaveCount(0);
  },
);

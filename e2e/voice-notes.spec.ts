// Phase 15: voice notes. The microphone is a synthetic tone, so no device or permission dialog is
// needed. Where the test browser has no MediaRecorder, the app must say so instead.
import { expect, test, type Page } from '@playwright/test';
import { importBook } from './helpers';

/** Replaces the microphone with a 440 Hz tone (installed before the app loads). */
function fakeMicrophone() {
  navigator.mediaDevices.getUserMedia = async () => {
    const context = new AudioContext();
    const tone = context.createOscillator();
    const output = context.createMediaStreamDestination();
    tone.connect(output);
    tone.start();
    return output.stream;
  };
}

function deniedMicrophone() {
  navigator.mediaDevices.getUserMedia = async () => {
    throw new DOMException('Permission denied', 'NotAllowedError');
  };
}

const canRecord = (page: Page) => page.evaluate(() => typeof MediaRecorder !== 'undefined');

function voiceList(page: Page) {
  return page.getByRole('list', { name: 'Book voice notes' }).getByRole('listitem');
}

async function openNotes(page: Page) {
  await page.getByRole('button', { name: 'Notes', exact: true }).click();
}

async function record(page: Page, ms: number) {
  await page.getByRole('button', { name: 'Record voice note on this page' }).click();
  await expect(page.getByText(/^Recording on page/)).toBeVisible();
  await page.waitForTimeout(ms);
  await page.getByRole('button', { name: 'Stop and save' }).click();
}

/** Bytes behind an audio element's object URL. */
async function audioBytes(page: Page, index = 0): Promise<number> {
  return voiceList(page)
    .nth(index)
    .locator('audio')
    .evaluate(async (audio: HTMLAudioElement) => (await (await fetch(audio.src)).blob()).size);
}

test.describe('with a microphone', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(fakeMicrophone);
    await page.goto('/');
    await importBook(page, 'text-4-pages.pdf');
  });

  test('a page voice note is recorded, played from the Notes panel, and kept after a reload', async ({
    page,
  }) => {
    await openNotes(page);
    if (!(await canRecord(page))) {
      await page.getByRole('button', { name: 'Record voice note on this page' }).click();
      await expect(page.getByText("Recording isn't available in this browser.")).toBeVisible();
      return;
    }
    await record(page, 1500);
    await expect(voiceList(page)).toHaveCount(1);
    await expect(voiceList(page).first()).toContainText('Page · Page 1 · 0:01');
    expect(await audioBytes(page)).toBeGreaterThan(100);

    await page.reload();
    await page
      .getByRole('list', { name: 'Your books' })
      .getByRole('button', { name: 'text-4-pages', exact: true })
      .click();
    await openNotes(page);
    await expect(voiceList(page)).toHaveCount(1);
    expect(await audioBytes(page)).toBeGreaterThan(100);

    await page.getByRole('button', { name: 'Delete voice note' }).click();
    await expect(voiceList(page)).toHaveCount(0);
  });

  test('a voice note on a highlight shows its passage, and goes with the highlight', async ({
    page,
  }) => {
    test.skip(!(await canRecord(page)), 'This test browser has no MediaRecorder');
    await expect(
      page.locator('[data-page-index="0"] .textLayer span', { hasText: 'Charlie three' }),
    ).toHaveCount(1);
    await page.evaluate(() => {
      const span = [...document.querySelectorAll('[data-page-index="0"] .textLayer span')].find(
        (s) => s.textContent?.includes('Charlie three'),
      );
      const node = span?.firstChild;
      if (!(node instanceof Text)) throw new Error('no text');
      const range = document.createRange();
      range.setStart(node, 0);
      range.setEnd(node, 'Charlie three'.length);
      document.getSelection()?.removeAllRanges();
      document.getSelection()?.addRange(range);
    });
    await page.getByRole('button', { name: 'Highlight', exact: true }).click();
    await expect(page.locator('.highlight-box')).toHaveCount(1);
    const box = await page.locator('.highlight-box').first().boundingBox();
    if (!box) throw new Error('no highlight');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.getByRole('button', { name: 'Voice note', exact: true }).click();
    await expect(page.getByText(/^Recording on a highlight on page 1/)).toBeVisible();
    await page.waitForTimeout(1200);
    await page.getByRole('button', { name: 'Stop and save' }).click();
    await expect(voiceList(page)).toHaveCount(1);
    await expect(voiceList(page).first()).toContainText('“Charlie three”');

    // Removing the highlight removes its voice note. (The open panel moved the page.)
    const moved = await page.locator('.highlight-box').first().boundingBox();
    if (!moved) throw new Error('no highlight');
    await page.mouse.click(moved.x + moved.width / 2, moved.y + moved.height / 2);
    await page.getByRole('button', { name: 'Remove highlight', exact: true }).click();
    await expect(voiceList(page)).toHaveCount(0);
  });

  test('closing the Notes panel while recording keeps the recording visible, and it can be saved', async ({
    page,
  }) => {
    test.skip(!(await canRecord(page)), 'This test browser has no MediaRecorder');
    await openNotes(page);
    await page.getByRole('button', { name: 'Record voice note on this page' }).click();
    await expect(page.getByText(/^Recording on page/)).toBeVisible();
    await page.getByRole('button', { name: 'Notes', exact: true }).click();
    const bar = page.getByRole('toolbar', { name: 'Recording' });
    await expect(bar).toBeVisible();
    await page.waitForTimeout(800);
    await bar.getByRole('button', { name: 'Stop and save' }).click();
    await expect(bar).toHaveCount(0);
    await openNotes(page);
    await expect(voiceList(page)).toHaveCount(1);
  });

  test('cancelling a recording keeps nothing', async ({ page }) => {
    test.skip(!(await canRecord(page)), 'This test browser has no MediaRecorder');
    await openNotes(page);
    await page.getByRole('button', { name: 'Record voice note on this page' }).click();
    await page.getByRole('button', { name: 'Cancel recording' }).click();
    await expect(
      page.getByRole('button', { name: 'Record voice note on this page' }),
    ).toBeVisible();
    await expect(voiceList(page)).toHaveCount(0);
  });
});

test('a refused microphone gets a readable message', async ({ page }) => {
  await page.addInitScript(deniedMicrophone);
  await page.goto('/');
  await importBook(page, 'text-4-pages.pdf');
  await openNotes(page);
  await page.getByRole('button', { name: 'Record voice note on this page' }).click();
  const expected = (await canRecord(page))
    ? 'Allow the microphone for this app to record voice notes.'
    : "Recording isn't available in this browser.";
  await expect(page.getByRole('alert')).toHaveText(expected);
});

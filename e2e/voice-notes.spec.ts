// Phase 15: voice notes. The microphone is a synthetic tone, so no device or permission dialog is
// needed. Where the test browser has no MediaRecorder, the app must say so instead.
import { expect, test, type Page } from '@playwright/test';
import { importBook, openPanel, pressTool } from './helpers';

// The stand-ins go on MediaDevices.prototype, not on navigator.mediaDevices: WebKit on macOS can
// garbage-collect the mediaDevices wrapper when nothing holds it, and a property set on it is lost.

/** Replaces the microphone with a 440 Hz tone (installed before the app loads). */
function fakeMicrophone() {
  MediaDevices.prototype.getUserMedia = async () => {
    const context = new AudioContext();
    const tone = context.createOscillator();
    const output = context.createMediaStreamDestination();
    tone.connect(output);
    tone.start();
    return output.stream;
  };
}

function deniedMicrophone() {
  MediaDevices.prototype.getUserMedia = async () => {
    throw new DOMException('Permission denied', 'NotAllowedError');
  };
}

const canRecord = (page: Page) => page.evaluate(() => typeof MediaRecorder !== 'undefined');

function voiceList(page: Page) {
  return page.getByRole('list', { name: 'Book voice notes' }).getByRole('listitem');
}

async function openNotes(page: Page) {
  await openPanel(page, 'Notes');
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
    await page.getByRole('radio', { name: 'Yellow', exact: true }).click();
    await expect(page.locator('.highlight-box')).toHaveCount(1);
    const box = await page.locator('.highlight-box').first().boundingBox();
    if (!box) throw new Error('no highlight');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    // Voice note moved from the selection menu into the note editor (phase 23).
    await page.getByRole('button', { name: 'Add note', exact: true }).click();
    await page.getByRole('button', { name: 'Record voice note', exact: true }).click();
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
    await pressTool(page, 'Contents');
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

test.describe('the voice note strip (phase 23)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(fakeMicrophone);
    await page.goto('/');
    await importBook(page, 'text-4-pages.pdf');
  });

  test('recording shows the strip: Recording, where, the time, Stop and Cancel', async ({
    page,
  }) => {
    test.skip(!(await canRecord(page)), 'This test browser has no MediaRecorder');
    await openNotes(page);
    await page.getByRole('button', { name: 'Record voice note on this page' }).click();
    const strip = page.locator('.voice-notes .br-voice.is-recording');
    await expect(strip).toBeVisible();
    await expect(strip).toContainText(/^Recording on page 1 · 0:0\d/);
    await expect(strip.locator('.br-voice__dot')).toBeVisible();
    await expect(strip.getByRole('button', { name: 'Stop and save' })).toHaveText('Stop');
    await expect(strip.getByRole('button', { name: 'Cancel recording' })).toBeVisible();
    await page.waitForTimeout(800);
    await strip.getByRole('button', { name: 'Stop and save' }).click();
    await expect(voiceList(page)).toHaveCount(1);
  });

  test('a row plays and pauses from its strip, with a waveform of the recording and the time', async ({
    page,
  }) => {
    test.skip(!(await canRecord(page)), 'This test browser has no MediaRecorder');
    await openNotes(page);
    await record(page, 1500);
    const row = voiceList(page).first();
    const strip = row.locator('.br-voice');
    await expect(strip).toBeVisible();
    await expect(strip.locator('.br-voice__time')).toHaveText(/^0:0[12]$/);
    const bars = strip.locator('.br-voice__bar');
    await expect(bars).toHaveCount(28);
    // The tone is loud from start to end: the bars stand well above the flat line.
    await expect
      .poll(() => bars.evaluateAll((all) => Math.max(...all.map((bar) => bar.clientHeight))))
      .toBeGreaterThan(12);
    await strip.getByRole('button', { name: 'Play voice note' }).click();
    await expect(strip.getByRole('button', { name: 'Pause voice note' })).toBeVisible();
    await expect.poll(() => strip.locator('.br-voice__bar.is-played').count()).toBeGreaterThan(0);
    await expect(strip.locator('.br-voice__time')).toContainText(' / ');
    await strip.getByRole('button', { name: 'Pause voice note' }).click();
    await expect(strip.getByRole('button', { name: 'Play voice note' })).toBeVisible();
  });

  test('Record voice note is in the note editor; the selection menu has no Voice note', async ({
    page,
  }) => {
    test.skip(!(await canRecord(page)), 'This test browser has no MediaRecorder');
    // A page note's editor.
    await openNotes(page);
    await page.getByRole('button', { name: 'Add note to this page', exact: true }).click();
    await page.getByRole('button', { name: 'Record voice note', exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'Note text' })).toHaveCount(0);
    await expect(page.getByText(/^Recording on page 1/)).toBeVisible();
    await page.getByRole('button', { name: 'Cancel recording' }).click();

    // A highlight's: the menu over it has no Voice note; its note editor has Record voice note.
    await page
      .locator('[data-page-index="0"] .textLayer span', { hasText: 'Charlie three' })
      .evaluate((span) => {
        const node = span.firstChild;
        if (!(node instanceof Text)) throw new Error('no text');
        const range = document.createRange();
        range.setStart(node, 0);
        range.setEnd(node, 'Charlie three'.length);
        document.getSelection()?.removeAllRanges();
        document.getSelection()?.addRange(range);
      });
    await page.getByRole('radio', { name: 'Yellow', exact: true }).click();
    const menu = page.getByRole('toolbar', { name: 'Highlight' });
    await expect(menu.getByRole('button', { name: 'Remove highlight' })).toBeVisible();
    await expect(menu.getByRole('button', { name: 'Voice note', exact: true })).toHaveCount(0);
    await menu.getByRole('button', { name: 'Add note', exact: true }).click();
    await page.getByRole('button', { name: 'Record voice note', exact: true }).click();
    await expect(page.getByText(/^Recording on a highlight on page 1/)).toBeVisible();
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: 'Stop and save' }).first().click();
    await expect(voiceList(page)).toHaveCount(1);
    await expect(voiceList(page).first()).toContainText('“Charlie three”');
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

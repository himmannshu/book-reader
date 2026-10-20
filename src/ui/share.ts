// Hands a passage to another app (phase 17): the system share sheet where the browser has one
// (Safari on iPhone, iPad and Mac), otherwise a copy to the clipboard.

export type ShareResult = 'shared' | 'copied' | 'cancelled';

export async function shareText(title: string, text: string): Promise<ShareResult> {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text });
      return 'shared';
    } catch (error) {
      // The reader closed the share sheet.
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
      // Not allowed here (for example without a tap): copy instead.
      console.error('Sharing failed; copying instead', error);
    }
  }
  if (!navigator.clipboard?.writeText)
    throw new Error('Neither sharing nor the clipboard work here');
  await navigator.clipboard.writeText(text);
  return 'copied';
}

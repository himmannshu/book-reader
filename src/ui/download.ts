// Saves text as a file the browser downloads (phase 12). On iPhone and iPad, Safari shows the
// file and offers Save to Files and sharing.

export function downloadText(fileName: string, text: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';
  document.body.append(link);
  link.click();
  link.remove();
  // Revoking at once can cancel the download in Safari.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

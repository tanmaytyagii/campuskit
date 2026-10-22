/** Starts a browser download for bytes or text created in the page. */
export function downloadFile(data: Uint8Array | string, fileName: string, mimeType: string): void {
  const part: BlobPart = typeof data === 'string' ? data : new Uint8Array(data);
  const blob = new Blob([part], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();
  // Give the browser time to start the download before releasing the memory.
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

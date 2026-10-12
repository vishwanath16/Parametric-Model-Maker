/** Saves data to the user's downloads folder under the given file name. */
export function downloadFile(data: string | ArrayBuffer | Uint8Array, fileName: string, mimeType: string): void {
  // Copying into a fresh Uint8Array gives Blob a plain ArrayBuffer-backed view.
  const part = typeof data === 'string' ? data : new Uint8Array(data)
  const url = URL.createObjectURL(new Blob([part], { type: mimeType }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Revoke after the browser has had a chance to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

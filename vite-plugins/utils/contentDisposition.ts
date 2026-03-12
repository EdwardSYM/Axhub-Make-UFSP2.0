function encodeRFC5987Value(value: string): string {
  return encodeURIComponent(value).replace(/['()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function createAsciiFallback(fileName: string): string {
  const normalized = fileName
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]+/g, '_')
    .replace(/["\\;%]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();

  return normalized || 'download';
}

export function buildAttachmentContentDisposition(fileName: string): string {
  const fallback = createAsciiFallback(fileName);
  const encoded = encodeRFC5987Value(fileName);
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

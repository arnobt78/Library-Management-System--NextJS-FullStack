// Parent: REQ-0026

const startsWith = (bytes: Uint8Array, signature: readonly number[]) =>
  signature.every((value, index) => bytes[index] === value);

export function matchesMediaSignature(mime: string, bytes: Uint8Array): boolean {
  if (mime === "image/jpeg") return startsWith(bytes, [0xff, 0xd8, 0xff]);
  if (mime === "image/png") return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (mime === "image/webp") return startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes.slice(8), [0x57, 0x45, 0x42, 0x50]);
  if (mime === "video/mp4") return startsWith(bytes.slice(4), [0x66, 0x74, 0x79, 0x70]);
  if (mime === "video/webm") return startsWith(bytes, [0x1a, 0x45, 0xdf, 0xa3]);
  return false;
}

export async function validateMediaSignature(file: File): Promise<boolean> {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  return matchesMediaSignature(file.type, bytes);
}

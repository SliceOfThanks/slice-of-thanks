// Uploads an image to Publitio. Keys come from Supabase secrets only.
import { sha1Hex } from "./crypto.ts";

export async function publitioSignature(secret: string, timestamp: string, nonce: string) {
  return await sha1Hex(timestamp + nonce + secret);
}

export function dataUrlToBlob(dataUrl: string, maxBytes = 2_000_000): Blob | null {
  const m = dataUrl.match(/^data:(image\/(png|jpeg|webp|svg\+xml));base64,([A-Za-z0-9+/=]+)$/);
  if (!m) return null;
  const bin = atob(m[3]);
  if (bin.length > maxBytes) return null;
  return new Blob([Uint8Array.from(bin, (c) => c.charCodeAt(0))], { type: m[1] });
}

export async function publitioUpload(opts: { key: string; secret: string; blob: Blob; folder: string; title: string; fetchFn?: typeof fetch }) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = String(Math.floor(10000000 + Math.random() * 89999999));
  const signature = await publitioSignature(opts.secret, timestamp, nonce);
  const qs = new URLSearchParams({ api_key: opts.key, api_timestamp: timestamp, api_nonce: nonce, api_signature: signature, folder: opts.folder, title: opts.title, privacy: "1" });
  const form = new FormData();
  form.append("file", opts.blob, opts.title);
  const res = await (opts.fetchFn ?? fetch)(`https://api.publit.io/v1/files/create?${qs}`, { method: "POST", body: form });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) throw new Error("publitio_upload_failed");
  return String(json.url_preview ?? json.url_download ?? "");
}

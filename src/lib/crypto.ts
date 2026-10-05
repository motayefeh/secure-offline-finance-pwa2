/* رمزنگاری AES-GCM 256 با کلید مشتق‌شده از رمز عبور (PBKDF2-SHA256)
   همه عملیات با Web Crypto API انجام می‌شود؛ کلید فقط در حافظه نگه داشته می‌شود. */

const enc = new TextEncoder();
const dec = new TextDecoder();

export const DEFAULT_ITERATIONS = 310_000;

export function randomBytes(len: number): Uint8Array {
  const b = new Uint8Array(len);
  crypto.getRandomValues(b);
  return b;
}

export function toB64(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  return btoa(s);
}

export function fromB64(b64: string): Uint8Array {
  const raw = atob(b64);
  const u8 = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) u8[i] = raw.charCodeAt(i);
  return u8;
}

export async function deriveKey(
  password: string,
  salt: Uint8Array,
  iterations = DEFAULT_ITERATIONS
): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as unknown as BufferSource, iterations, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export interface Cipher {
  iv: string;
  ct: string;
}

export async function encryptJson(key: CryptoKey, data: unknown): Promise<Cipher> {
  const iv = randomBytes(12);
  const buf = enc.encode(JSON.stringify(data));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource, tagLength: 128 },
    key,
    buf
  );
  return { iv: toB64(iv), ct: toB64(ct) };
}

export async function decryptJson<T>(key: CryptoKey, cipher: Cipher): Promise<T> {
  const iv = fromB64(cipher.iv);
  const ct = fromB64(cipher.ct);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource, tagLength: 128 },
    key,
    ct as unknown as BufferSource
  );
  return JSON.parse(dec.decode(plain)) as T;
}

/** اثر انگشت کوتاه برای تأیید صحت رمز (بدون ذخیره رمز) */
export async function passwordVerifier(key: CryptoKey): Promise<string> {
  const c = await encryptJson(key, { ok: "pf", t: 1 });
  return `${c.iv}.${c.ct.slice(0, 24)}`;
}

export async function sha256Hex(text: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", enc.encode(text));
  return toB64(d);
}

export function newSalt(): string {
  return toB64(randomBytes(16));
}

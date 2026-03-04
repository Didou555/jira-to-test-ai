const ALGORITHM = "AES-GCM";
const IV_LENGTH = 12;
const AES_256_KEY_BYTES = 32;

function getEncryptionKey(): string {
  const key = Deno.env.get("ENCRYPTION_KEY")?.trim();
  if (!key) throw new Error("ENCRYPTION_KEY not configured");
  return key;
}

function decodeBase64Flexible(input: string): Uint8Array {
  // Support standard base64 + base64url variants with or without padding
  const normalized = input.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4;
  const padded = padding === 0 ? normalized : normalized + "=".repeat(4 - padding);
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function decodeKey(rawKey: string): Uint8Array {
  const cleaned = rawKey.trim();

  // 1) base64/base64url (recommended)
  try {
    return decodeBase64Flexible(cleaned);
  } catch {
    // continue to other formats
  }

  // 2) hex (64 chars = 32 bytes)
  if (/^[0-9a-fA-F]{64}$/.test(cleaned)) {
    const bytes = new Uint8Array(AES_256_KEY_BYTES);
    for (let i = 0; i < AES_256_KEY_BYTES; i++) {
      bytes[i] = parseInt(cleaned.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  }

  // 3) raw 32-char string fallback
  if (cleaned.length === AES_256_KEY_BYTES) {
    return new TextEncoder().encode(cleaned);
  }

  throw new Error(
    "Invalid ENCRYPTION_KEY format. Provide a 32-byte key as base64 (recommended), base64url, hex(64), or raw 32 chars."
  );
}

async function importKey(rawKey: string): Promise<CryptoKey> {
  const keyBytes = decodeKey(rawKey);

  if (keyBytes.byteLength !== AES_256_KEY_BYTES) {
    throw new Error(
      `Invalid ENCRYPTION_KEY length: expected ${AES_256_KEY_BYTES} bytes for AES-256, got ${keyBytes.byteLength}.`
    );
  }

  return crypto.subtle.importKey("raw", keyBytes, { name: ALGORITHM }, false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encrypt(plaintext: string): Promise<string> {
  if (!plaintext) return plaintext;
  const key = await importKey(getEncryptionKey());
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, encoded);
  const ivB64 = btoa(String.fromCharCode(...iv));
  const ctB64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)));
  return `enc:${ivB64}:${ctB64}`;
}

export async function decrypt(encrypted: string): Promise<string> {
  if (!encrypted) return encrypted;
  if (!encrypted.startsWith("enc:")) return encrypted;

  const key = await importKey(getEncryptionKey());
  const parts = encrypted.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted format");

  const iv = Uint8Array.from(atob(parts[1]), (c) => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(parts[2]), (c) => c.charCodeAt(0));

  const decrypted = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}

const SENSITIVE_FIELDS = [
  "jira_api_token",
  "qmetry_api_token",
  "aws_secret_access_key",
  "aws_session_token",
  "aws_access_key_id",
];

export async function encryptApiKeys(
  keys: Record<string, string | null>
): Promise<Record<string, string | null>> {
  const result = { ...keys };
  for (const field of SENSITIVE_FIELDS) {
    if (result[field] && !result[field]!.startsWith("enc:")) {
      result[field] = await encrypt(result[field]!);
    }
  }
  return result;
}

export async function decryptApiKeys(
  keys: Record<string, string | null>
): Promise<Record<string, string | null>> {
  const result = { ...keys };
  for (const field of SENSITIVE_FIELDS) {
    if (result[field] && result[field]!.startsWith("enc:")) {
      result[field] = await decrypt(result[field]!);
    }
  }
  return result;
}


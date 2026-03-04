const ALGORITHM = "AES-GCM";
const IV_LENGTH = 12;

function getEncryptionKey(): string {
  const key = Deno.env.get("ENCRYPTION_KEY");
  if (!key) throw new Error("ENCRYPTION_KEY not configured");
  return key;
}

async function importKey(rawKeyBase64: string): Promise<CryptoKey> {
  const rawKey = Uint8Array.from(atob(rawKeyBase64), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey("raw", rawKey, { name: ALGORITHM }, false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encrypt(plaintext: string): Promise<string> {
  if (!plaintext) return plaintext;
  const key = await importKey(getEncryptionKey());
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoded
  );
  // Format: base64(iv):base64(ciphertext)
  const ivB64 = btoa(String.fromCharCode(...iv));
  const ctB64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)));
  return `enc:${ivB64}:${ctB64}`;
}

export async function decrypt(encrypted: string): Promise<string> {
  if (!encrypted) return encrypted;
  // If not encrypted (legacy plaintext), return as-is
  if (!encrypted.startsWith("enc:")) return encrypted;

  const key = await importKey(getEncryptionKey());
  const parts = encrypted.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted format");

  const iv = Uint8Array.from(atob(parts[1]), (c) => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(parts[2]), (c) => c.charCodeAt(0));

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    ciphertext
  );
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

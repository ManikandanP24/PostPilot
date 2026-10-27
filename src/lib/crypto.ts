import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
function getKey() {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error("ENCRYPTION_KEY is required.");
  const key = /^[a-f0-9]{64}$/i.test(raw) ? Buffer.from(raw,"hex") : Buffer.from(raw,"base64");
  if (key.length !== 32) throw new Error("ENCRYPTION_KEY must be 32 bytes (64 hex characters or base64 for 32 bytes).");
  return key;
}
export function encryptSecret(plaintext: string) {
  const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm",getKey(),iv);
  const ciphertext=Buffer.concat([cipher.update(plaintext,"utf8"),cipher.final()]);
  return [iv,cipher.getAuthTag(),ciphertext].map(part=>part.toString("base64url")).join(".");
}
export function decryptSecret(payload: string) {
  const [ivRaw,tagRaw,ciphertextRaw]=payload.split(".");
  if(!ivRaw||!tagRaw||!ciphertextRaw)throw new Error("Stored credential is malformed.");
  const decipher=createDecipheriv("aes-256-gcm",getKey(),Buffer.from(ivRaw,"base64url"));
  decipher.setAuthTag(Buffer.from(tagRaw,"base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextRaw,"base64url")),decipher.final()]).toString("utf8");
}

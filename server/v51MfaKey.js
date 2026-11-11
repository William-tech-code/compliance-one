import crypto from "node:crypto";

// Keep support for existing 32-byte base64 secrets. Render's generated secrets
// may instead be strong text tokens, which require deterministic key derivation.
// Never silently accept short or empty values.
export function resolveMfaEncryptionKey(raw) {
  if(typeof raw!=="string" || raw.length<32 || raw.length>4096) return null;
  const normalized=raw.trim();
  if(/^[A-Za-z0-9+/]+={0,2}$/.test(normalized) && normalized.length%4===0){
    const bytes=Buffer.from(normalized,"base64");
    if(bytes.length===32 && bytes.toString("base64")===normalized) return bytes;
  }
  // Domain-separated from other secrets, stable between restarts.
  return crypto.createHash("sha256").update("NEXORA-MFA-AES256-GCM-V51\0").update(normalized).digest();
}

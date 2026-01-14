const SALT_LENGTH = 16;
const ITERATIONS = 10000;
const KEY_LENGTH = 32;

function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToArrayBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes.buffer;
}

function generateSalt(): string {
  try {
    const salt = new Uint8Array(SALT_LENGTH);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(salt);
    } else {
      for (let i = 0; i < SALT_LENGTH; i++) {
        salt[i] = Math.floor(Math.random() * 256);
      }
    }
    return arrayBufferToHex(salt.buffer);
  } catch (error) {
    console.error("Salt generation error:", error);
    let result = '';
    for (let i = 0; i < SALT_LENGTH * 2; i++) {
      result += Math.floor(Math.random() * 16).toString(16);
    }
    return result;
  }
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  let result = '';
  const input = str + hash.toString();
  for (let i = 0; i < KEY_LENGTH; i++) {
    let val = 0;
    for (let j = 0; j < input.length; j++) {
      val = ((val * 31) + input.charCodeAt(j) + i) & 0xFFFFFFFF;
    }
    result += (val & 0xFF).toString(16).padStart(2, '0');
  }
  return result;
}

async function deriveKey(password: string, salt: string): Promise<string> {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder();
      const passwordBuffer = encoder.encode(password);
      const saltBuffer = new Uint8Array(hexToArrayBuffer(salt));

      const keyMaterial = await crypto.subtle.importKey(
        "raw",
        passwordBuffer,
        "PBKDF2",
        false,
        ["deriveBits"]
      );

      const derivedBits = await crypto.subtle.deriveBits(
        {
          name: "PBKDF2",
          salt: saltBuffer,
          iterations: ITERATIONS,
          hash: "SHA-256",
        },
        keyMaterial,
        KEY_LENGTH * 8
      );

      return arrayBufferToHex(derivedBits);
    }
  } catch (error) {
    console.log("Web Crypto API not available, using fallback:", error);
  }
  
  let result = password + salt;
  for (let i = 0; i < 1000; i++) {
    result = simpleHash(result + salt + i.toString());
  }
  return result.substring(0, KEY_LENGTH * 2);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = generateSalt();
  const hash = await deriveKey(password, salt);
  return `${salt}:${hash}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  try {
    const [salt, hash] = storedHash.split(":");
    if (!salt || !hash) {
      return false;
    }
    const derivedHash = await deriveKey(password, salt);
    return derivedHash === hash;
  } catch (error) {
    console.error("Password verification error:", error);
    return false;
  }
}

export function generateSecureToken(): string {
  const tokenBytes = new Uint8Array(32);
  try {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(tokenBytes);
    } else {
      for (let i = 0; i < 32; i++) {
        tokenBytes[i] = Math.floor(Math.random() * 256);
      }
    }
  } catch {
    for (let i = 0; i < 32; i++) {
      tokenBytes[i] = Math.floor(Math.random() * 256);
    }
  }
  const timestamp = Date.now().toString(36);
  return `${arrayBufferToHex(tokenBytes.buffer)}_${timestamp}`;
}

export function isTokenExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}

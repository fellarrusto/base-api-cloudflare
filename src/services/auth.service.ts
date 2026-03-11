// Verifica JWT generica via JWKS — funziona con qualsiasi IDP (Firebase, Auth0, Keycloak, Cognito...)

export interface TokenPayload {
  sub: string;
  email?: string;
  name?: string;
  iss: string;
  aud: string | string[];
  exp: number;
  iat: number;
  [key: string]: unknown;
}

interface JWK {
  kty: string;
  kid: string;
  n: string;
  e: string;
  alg?: string;
  use?: string;
}

interface JWKSResponse {
  keys: JWK[];
}

let cachedJwks: { keys: JWK[]; expiry: number } | null = null;

async function getJwks(jwksUrl: string): Promise<JWK[]> {
  if (cachedJwks && Date.now() < cachedJwks.expiry) {
    return cachedJwks.keys;
  }
  const res = await fetch(jwksUrl);
  const data = await res.json() as JWKSResponse;
  const cacheControl = res.headers.get('cache-control') || '';
  const maxAge = parseInt(cacheControl.match(/max-age=(\d+)/)?.[1] || '3600');
  cachedJwks = { keys: data.keys, expiry: Date.now() + maxAge * 1000 };
  return data.keys;
}

function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

async function importJwk(jwk: JWK): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'jwk',
    { kty: jwk.kty, n: jwk.n, e: jwk.e },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );
}

export interface VerifyOptions {
  jwksUrl: string;
  issuer: string;
  audience: string;
}

export async function verifyToken(token: string, opts: VerifyOptions): Promise<TokenPayload> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token format');

  const header = JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[0])));
  const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[1]))) as TokenPayload;

  // Claims validation
  if (payload.iss !== opts.issuer) throw new Error('Invalid issuer');
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!aud.includes(opts.audience)) throw new Error('Invalid audience');
  if (payload.exp < Date.now() / 1000) throw new Error('Token expired');

  // Signature verification via JWKS
  const keys = await getJwks(opts.jwksUrl);
  const jwk = keys.find(k => k.kid === header.kid);
  if (!jwk) throw new Error('Unknown signing key');

  const key = await importJwk(jwk);
  const signature = base64UrlDecode(parts[2]);
  const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature, data);
  if (!valid) throw new Error('Invalid signature');

  return payload;
}
// Verifica JWT generica via JWKS — funziona con qualsiasi IDP (Firebase, Auth0, Keycloak, Cognito...)
import { ExternalServiceError, UnauthorizedError } from '../../core/exceptions';
import { TokenPayload, TokenVerifier } from './base-token-verifier';

const JWKS_TIMEOUT_MS = 5000;

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

// Per isolate, by JWKS URL
const jwksCache = new Map<string, { keys: JWK[]; expiry: number }>();

async function getJwks(jwksUrl: string): Promise<JWK[]> {
  const cached = jwksCache.get(jwksUrl);
  if (cached && Date.now() < cached.expiry) {
    return cached.keys;
  }
  let res: Response;
  try {
    res = await fetch(jwksUrl, { signal: AbortSignal.timeout(JWKS_TIMEOUT_MS) });
  } catch (e) {
    throw new ExternalServiceError(`JWKS request failed: ${(e as Error).name}`);
  }
  if (!res.ok) throw new ExternalServiceError(`JWKS endpoint returned HTTP ${res.status}`);
  const data = await res.json() as JWKSResponse;
  const cacheControl = res.headers.get('cache-control') || '';
  const maxAge = parseInt(cacheControl.match(/max-age=(\d+)/)?.[1] || '3600');
  jwksCache.set(jwksUrl, { keys: data.keys, expiry: Date.now() + maxAge * 1000 });
  return data.keys;
}

function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

function decodeJson<T>(part: string): T {
  return JSON.parse(new TextDecoder().decode(base64UrlDecode(part))) as T;
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

export class JwksTokenVerifier implements TokenVerifier {
  constructor(private opts: VerifyOptions) {}

  async verify(token: string): Promise<TokenPayload> {
    const opts = this.opts;
    const parts = token.split('.');
    if (parts.length !== 3) throw new UnauthorizedError('Invalid token format');

    let header: { kid?: string };
    let payload: TokenPayload;
    try {
      header = decodeJson(parts[0]);
      payload = decodeJson(parts[1]);
    } catch {
      throw new UnauthorizedError('Invalid token format');
    }

    // Claims validation
    if (payload.iss !== opts.issuer) throw new UnauthorizedError('Invalid issuer');
    const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!aud.includes(opts.audience)) throw new UnauthorizedError('Invalid audience');
    if (payload.exp < Date.now() / 1000) throw new UnauthorizedError('Token expired');

    // Signature verification via JWKS
    const keys = await getJwks(opts.jwksUrl);
    const jwk = keys.find(k => k.kid === header.kid);
    if (!jwk) throw new UnauthorizedError('Unknown signing key');

    const key = await importJwk(jwk);
    const signature = base64UrlDecode(parts[2]);
    const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature, data);
    if (!valid) throw new UnauthorizedError('Invalid signature');

    return payload;
  }
}

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { verifyToken } from './auth.service';

// Helpers per costruire un JWT fake
function base64url(obj: object): string {
  return btoa(JSON.stringify(obj))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function buildFakeToken(payload: object, header: object = { alg: 'RS256', kid: 'key1' }): string {
  return `${base64url(header)}.${base64url(payload)}.fakesignature`;
}

const VALID_PAYLOAD = {
  sub: 'user123',
  email: 'test@example.com',
  iss: 'https://issuer.example.com',
  aud: 'my-app',
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
};

const OPTS = {
  jwksUrl: 'https://issuer.example.com/.well-known/jwks.json',
  issuer: 'https://issuer.example.com',
  audience: 'my-app',
};

describe('auth.service - verifyToken', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    // Reset cache tra i test
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('throws on malformed token (wrong number of parts)', async () => {
    await expect(verifyToken('not.a.valid.jwt.here', OPTS)).rejects.toThrow('Invalid token format');
  });

  it('throws on invalid issuer', async () => {
    const token = buildFakeToken({ ...VALID_PAYLOAD, iss: 'https://wrong-issuer.com' });
    await expect(verifyToken(token, OPTS)).rejects.toThrow('Invalid issuer');
  });

  it('throws on invalid audience (string)', async () => {
    const token = buildFakeToken({ ...VALID_PAYLOAD, aud: 'wrong-app' });
    await expect(verifyToken(token, OPTS)).rejects.toThrow('Invalid audience');
  });

  it('throws on invalid audience (array not containing expected)', async () => {
    const token = buildFakeToken({ ...VALID_PAYLOAD, aud: ['other-app', 'another-app'] });
    await expect(verifyToken(token, OPTS)).rejects.toThrow('Invalid audience');
  });

  it('accepts audience when it is an array containing the expected value', async () => {
    const token = buildFakeToken({ ...VALID_PAYLOAD, aud: ['my-app', 'other-app'] });
    // Arriverà a fallire sul JWKS fetch, non sull'audience
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ keys: [] }),
      headers: { get: () => null },
    });
    vi.stubGlobal('fetch', fetchMock);
    await expect(verifyToken(token, OPTS)).rejects.toThrow('Unknown signing key');
  });

  it('throws on expired token', async () => {
    const token = buildFakeToken({
      ...VALID_PAYLOAD,
      exp: Math.floor(Date.now() / 1000) - 10,
    });
    await expect(verifyToken(token, OPTS)).rejects.toThrow('Token expired');
  });

  it('throws when kid is not found in JWKS', async () => {
    const token = buildFakeToken(VALID_PAYLOAD, { alg: 'RS256', kid: 'unknown-kid' });
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ keys: [{ kid: 'other-key', kty: 'RSA', n: 'x', e: 'AQAB' }] }),
      headers: { get: () => 'max-age=3600' },
    });
    vi.stubGlobal('fetch', fetchMock);
    await expect(verifyToken(token, OPTS)).rejects.toThrow('Unknown signing key');
  });
});

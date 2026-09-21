// Connector factories: the only place that knows which provider is active.
// Services get connectors from here and never call fetch() directly.
import { Env } from '../core/types';
import { TokenVerifier } from './auth/base-token-verifier';
import { JwksTokenVerifier } from './auth/jwks-token-verifier';

export function getTokenVerifier(env: Env): TokenVerifier {
  return new JwksTokenVerifier({
    jwksUrl: env.AUTH_JWKS_URL,
    issuer: env.AUTH_ISSUER,
    audience: env.AUTH_AUDIENCE,
  });
}

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

/** Provider-agnostic contract: turns a bearer token into its verified claims or throws. */
export interface TokenVerifier {
  verify(token: string): Promise<TokenPayload>;
}

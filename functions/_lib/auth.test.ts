// @vitest-environment node
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair, type JWTVerifyGetKey } from 'jose';
import { beforeAll, describe, expect, it } from 'vitest';
import { AuthError, identify } from './auth';

const TEAM = 'gentle-pond-af51.cloudflareaccess.com';
const AUD = 'audience-tag-123';
const env = { ACCESS_TEAM_DOMAIN: TEAM, ACCESS_AUD: AUD };

let privateKey: CryptoKey;
let otherKey: CryptoKey;
let jwks: JWTVerifyGetKey;

beforeAll(async () => {
  const pair = await generateKeyPair('RS256');
  privateKey = pair.privateKey;
  otherKey = (await generateKeyPair('RS256')).privateKey;
  const jwk = { ...(await exportJWK(pair.publicKey)), kid: 'k1', alg: 'RS256' };
  jwks = createLocalJWKSet({ keys: [jwk] });
});

async function token(
  claims: Record<string, unknown>,
  opts: { key?: CryptoKey; aud?: string; iss?: string } = {},
) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
    .setIssuer(opts.iss ?? `https://${TEAM}`)
    .setAudience(opts.aud ?? AUD)
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(opts.key ?? privateKey);
}

function request(jwt?: string, url = 'https://book-reader-cpi.pages.dev/api/sync') {
  return new Request(url, { headers: jwt ? { 'cf-access-jwt-assertion': jwt } : {} });
}

async function status(promise: Promise<unknown>): Promise<number> {
  try {
    await promise;
    return 200;
  } catch (error) {
    if (error instanceof AuthError) return error.status;
    throw error;
  }
}

describe('identify', () => {
  it('accepts a valid Access token and returns its email, lowercased', async () => {
    const jwt = await token({ email: 'Me@Example.com' });
    expect(await identify(request(jwt), env, jwks)).toBe('me@example.com');
  });

  it('rejects a request without a token', async () => {
    expect(await status(identify(request(), env, jwks))).toBe(401);
  });

  it('rejects a token signed by another key, for another audience, or another team', async () => {
    expect(
      await status(
        identify(request(await token({ email: 'a@b.c' }, { key: otherKey })), env, jwks),
      ),
    ).toBe(401);
    expect(
      await status(identify(request(await token({ email: 'a@b.c' }, { aud: 'other' })), env, jwks)),
    ).toBe(401);
    expect(
      await status(
        identify(
          request(await token({ email: 'a@b.c' }, { iss: 'https://evil.example' })),
          env,
          jwks,
        ),
      ),
    ).toBe(401);
  });

  it('rejects a valid token without an email', async () => {
    expect(await status(identify(request(await token({ sub: 'x' })), env, jwks))).toBe(401);
  });

  it('refuses to run without its configuration', async () => {
    expect(await status(identify(request(await token({ email: 'a@b.c' })), {}, jwks))).toBe(500);
  });

  it('dev mode lets local tests choose a user per request, still only on localhost', async () => {
    const dev = { AUTH_MODE: 'dev', DEV_USER: 'dev@local' };
    const local = new Request('http://localhost:8788/api/sync', {
      headers: { 'x-dev-user': 'Test-1@Local' },
    });
    expect(await identify(local, dev)).toBe('test-1@local');
    const remote = new Request('https://book-reader-cpi.pages.dev/api/sync', {
      headers: { 'x-dev-user': 'someone@else' },
    });
    expect(await status(identify(remote, dev))).toBe(401);
  });

  it('ignores the dev user header outside dev mode', async () => {
    const jwt = await token({ email: 'me@example.com' });
    const req = new Request('https://book-reader-cpi.pages.dev/api/sync', {
      headers: { 'cf-access-jwt-assertion': jwt, 'x-dev-user': 'attacker@example.com' },
    });
    expect(await identify(req, env, jwks)).toBe('me@example.com');
  });

  it('dev mode works only on localhost', async () => {
    const dev = { AUTH_MODE: 'dev', DEV_USER: 'dev@local' };
    expect(await identify(request(undefined, 'http://localhost:8788/api/sync'), dev)).toBe(
      'dev@local',
    );
    expect(await identify(request(undefined, 'http://127.0.0.1:8788/api/sync'), dev)).toBe(
      'dev@local',
    );
    expect(
      await status(identify(request(undefined, 'https://book-reader-cpi.pages.dev/api/sync'), dev)),
    ).toBe(401);
  });
});

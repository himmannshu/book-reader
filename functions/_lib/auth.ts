// Who is calling? Cloudflare Access sits in front of the site and adds a signed token
// (Cf-Access-Jwt-Assertion). We verify it ourselves too, so the API never trusts an unsigned header.
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';

export interface AuthEnv {
  /** Team domain, e.g. "gentle-pond-af51.cloudflareaccess.com". */
  ACCESS_TEAM_DOMAIN?: string;
  /** The Access application's Audience (AUD) tag. */
  ACCESS_AUD?: string;
  /** "dev" only in local tests (wrangler pages dev); refused on any host but localhost. */
  AUTH_MODE?: string;
  DEV_USER?: string;
}

export class AuthError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

const keySets = new Map<string, JWTVerifyGetKey>();

function teamKeys(team: string): JWTVerifyGetKey {
  let keys = keySets.get(team);
  if (!keys) {
    keys = createRemoteJWKSet(new URL(`${team}/cdn-cgi/access/certs`));
    keySets.set(team, keys);
  }
  return keys;
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/** The caller's email (lowercased). Throws AuthError(401) if not signed in. */
export async function identify(
  request: Request,
  env: AuthEnv,
  getKey?: JWTVerifyGetKey,
): Promise<string> {
  if (env.AUTH_MODE === 'dev') {
    if (!LOCAL_HOSTS.has(new URL(request.url).hostname)) {
      throw new AuthError(401, 'Not signed in');
    }
    return (env.DEV_USER ?? 'dev@localhost').toLowerCase();
  }
  const domain = env.ACCESS_TEAM_DOMAIN?.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  if (!domain || !env.ACCESS_AUD) throw new AuthError(500, 'Sync is not configured');

  const token = request.headers.get('cf-access-jwt-assertion');
  if (!token) throw new AuthError(401, 'Not signed in');
  const team = `https://${domain}`;
  try {
    const { payload } = await jwtVerify(token, getKey ?? teamKeys(team), {
      issuer: team,
      audience: env.ACCESS_AUD,
    });
    if (typeof payload.email !== 'string' || !payload.email) throw new Error('no email claim');
    return payload.email.toLowerCase();
  } catch {
    throw new AuthError(401, 'Not signed in');
  }
}

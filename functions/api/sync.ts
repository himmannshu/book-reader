// POST /api/sync (Cloudflare Pages Function). Bindings: DB (D1). Vars: ACCESS_TEAM_DOMAIN, ACCESS_AUD.
import type { AuthEnv } from '../_lib/auth';
import { d1 } from '../_lib/d1';
import { handleSync } from '../_lib/handler';

interface Env extends AuthEnv {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = ({ request, env }) =>
  handleSync(request, env, d1(env.DB));

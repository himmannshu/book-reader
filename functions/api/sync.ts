// POST /api/sync (Cloudflare Pages Function). Bindings: DB (D1), FILES (R2, phase 09b; optional).
// Vars: ACCESS_TEAM_DOMAIN, ACCESS_AUD.
import type { AuthEnv } from '../_lib/auth';
import { d1 } from '../_lib/d1';
import { handleSync } from '../_lib/handler';
import { r2 } from '../_lib/r2';

interface Env extends AuthEnv {
  DB: D1Database;
  FILES?: R2Bucket;
}

export const onRequestPost: PagesFunction<Env> = ({ request, env }) =>
  handleSync(request, env, d1(env.DB), undefined, env.FILES ? r2(env.FILES) : null);

// /api/files/... (Cloudflare Pages Function). Bindings: DB (D1), FILES (R2).
// Vars: ACCESS_TEAM_DOMAIN, ACCESS_AUD, optional FILES_CAP_BYTES.
import { d1 } from '../../_lib/d1';
import { handleFiles, type FilesEnv } from '../../_lib/files';
import { r2 } from '../../_lib/r2';

interface Env extends FilesEnv {
  DB: D1Database;
  FILES?: R2Bucket;
}

export const onRequest: PagesFunction<Env> = ({ request, env }) =>
  handleFiles(request, env, d1(env.DB), env.FILES ? r2(env.FILES) : null);

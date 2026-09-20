// Single-owner paper dashboard. HTTPS is required outside localhost.
// Password is server-only; never use NEXT_PUBLIC_ variables for these credentials.
function response(status: number, message: string, challenge = false) {
  return new Response(JSON.stringify({ error: message }), {
    status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store',
      ...(challenge ? { 'WWW-Authenticate': 'Basic realm="NOEUL Paper", charset="UTF-8"' } : {}) },
  });
}
async function equalSecret(a: string, b: string) {
  const encoder = new TextEncoder();
  const [x,y] = await Promise.all([a,b].map(s => crypto.subtle.digest('SHA-256',encoder.encode(s))));
  const p=new Uint8Array(x), q=new Uint8Array(y);
  let mismatch=0; for(let i=0;i<p.length;i++) mismatch |= p[i]^q[i];
  return mismatch===0;
}
function originConfig(): string | null {
  try {
    const url=new URL(process.env.PAPER_APP_ORIGIN ?? '');
    if (url.username || url.password || url.pathname!=='/' || url.search || url.hash) return null;
    if (url.protocol!=='https:' && !(url.protocol==='http:' && ['localhost','127.0.0.1','[::1]'].includes(url.hostname))) return null;
    return url.origin;
  } catch { return null; }
}
// CODESPACES_ORIGIN_V1: a development-only, exact port-forward mapping.
// Browser-controlled Fetch Metadata is required; never trust wildcard localhost.
function isCodespacesDevOrigin(request: Request, origin: string | null, allowedOrigin: string): boolean {
  if (process.env.NODE_ENV !== 'development' || process.env.CODESPACES !== 'true') return false;
  if (request.headers.get('sec-fetch-site') !== 'same-origin') return false;
  const name = process.env.CODESPACE_NAME;
  const domain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;
  if (!name || !domain || !/^[a-zA-Z0-9-]+$/.test(name) || !/^[a-zA-Z0-9.-]+$/.test(domain)) return false;
  const match = origin?.match(/^https:\/\/localhost:([1-9][0-9]{0,4})$/);
  if (!match || Number(match[1]) > 65535) return false;
  if (allowedOrigin !== `https://${name}-${match[1]}.${domain}`) return false;
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method.toUpperCase()) &&
      request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return false;
  return true;
}


export async function authorizePaperRequest(request: Request, page = false, scope: 'ADMIN' | 'CRON' = 'ADMIN'): Promise<Response | null> {
  const authorization=request.headers.get('authorization') ?? '';
  if (authorization.length>4096) return response(401,'Unauthorized',page);
  // These endpoints can close positions even on GET: never accept browser Basic auth.
  if (scope==='CRON') {
    const secret=process.env.CRON_SECRET;
    if (!secret || secret.length<32) return response(503,'Cron authentication not configured');
    if (!/^Bearer /i.test(authorization) || !(await equalSecret(authorization.slice(7),secret))) return response(401,'Unauthorized');
    if (request.headers.has('origin') || request.headers.get('sec-fetch-site')==='cross-site') return response(403,'Browser cron requests blocked');
    return null;
  }
  const user=process.env.PAPER_ADMIN_USER, password=process.env.PAPER_ADMIN_PASSWORD;
  const allowedOrigin=originConfig();
  if (!user || !/^[A-Za-z0-9_-]+$/.test(user) || !password ||
      password.length<32 || password.length>1024 || !/^[\x21-\x7e]+$/.test(password) ||
      !allowedOrigin) return response(503,'Admin authentication not configured');
  let credentials='';
  try { if (/^Basic /i.test(authorization)) credentials=atob(authorization.slice(6)); } catch { /* deny */ }
  if (!(await equalSecret(credentials,`${user}:${password}`))) return response(401,'Unauthorized',page);
  const origin=request.headers.get('origin');
  const unsafe=!['GET','HEAD','OPTIONS'].includes(request.method.toUpperCase());
  const originAllowed = origin === allowedOrigin || isCodespacesDevOrigin(request, origin, allowedOrigin);
  if ((unsafe && !originAllowed) || (origin!==null && !originAllowed) ||
      (!page && request.headers.get('sec-fetch-site')==='cross-site')) {
    // PAPER_ORIGIN_DIAGNOSTIC_V1: no credentials, cookies or request URLs.
    const safeOrigin = (value: string | null) => {
      if (value === null) return 'MISSING';
      if (value === 'null') return 'NULL_ORIGIN';
      try {
        const parsed = new URL(value);
        if (!['https:', 'http:'].includes(parsed.protocol)) return 'INVALID';
        return parsed.origin.slice(0, 200);
      } catch { return 'INVALID'; }
    };
    const fetchSite = request.headers.get('sec-fetch-site');
    console.warn('PAPER_ORIGIN_DIAGNOSTIC', JSON.stringify({
      receivedOrigin: safeOrigin(origin),
      configuredOrigin: safeOrigin(allowedOrigin),
      originExactMatch: origin === allowedOrigin,
      fetchSite: fetchSite === null ? 'MISSING' :
        ['same-origin','same-site','cross-site','none'].includes(fetchSite) ? fetchSite : 'OTHER',
      reason: origin !== allowedOrigin ? 'ORIGIN_MISSING_OR_DIFFERENT' : 'CROSS_SITE_HEADER'
    }));
    return response(403,'Cross-origin request blocked');
  }
  return null;
}
export function withPaperAuth<T extends Request = Request>(handler: (request: T, context?: any) => Response | Promise<Response>, scope: 'ADMIN' | 'CRON' = 'ADMIN') {
  return async function(request: T, context?: any): Promise<Response> {
    const denied=await authorizePaperRequest(request, false, scope);
    if (denied) return denied;
    const result=await handler(request,context);
    result.headers.set('Cache-Control','private, no-store');
    return result;
  };
}

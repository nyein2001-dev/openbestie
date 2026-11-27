import { createRemoteJWKSet, type JWTVerifyGetKey, jwtVerify } from "jose";
import { type Env, httpsUrl, isEmail } from "./store";

const remoteKeys = new Map<string, JWTVerifyGetKey>();
export function accessKeys(issuer: string) {
  let key = remoteKeys.get(issuer);
  if (!key) {
    key = createRemoteJWKSet(new URL("/cdn-cgi/access/certs", issuer), { timeoutDuration: 4000 });
    remoteKeys.set(issuer, key);
  }
  return key;
}

export async function digest(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function authorize(request: Request, env: Env, keys: typeof accessKeys) {
  const url = new URL(request.url);
  const issuer = httpsUrl(env.ACCESS_ISSUER);
  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (
    env.STAGE !== "production" ||
    !env.ADMIN_HOST ||
    url.host !== env.ADMIN_HOST.toLowerCase() ||
    !issuer ||
    issuer.href !== `${issuer.origin}/` ||
    !/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(issuer.hostname) ||
    !env.ACCESS_AUDIENCE ||
    !env.OWNER_EMAIL ||
    !isEmail(env.OWNER_EMAIL) ||
    !token ||
    token.length > 8192
  )
    return;
  try {
    const { payload } = await jwtVerify(token, keys(issuer.origin), {
      algorithms: ["RS256"],
      issuer: issuer.origin,
      audience: env.ACCESS_AUDIENCE,
      requiredClaims: ["exp", "email", "sub"],
    });
    if (typeof payload.email !== "string" || payload.email.toLowerCase() !== env.OWNER_EMAIL.toLowerCase())
      return;
    return await digest(token);
  } catch {
    return;
  }
}

export function sameOrigin(request: Request) {
  return (
    request.headers.get("Origin") === new URL(request.url).origin &&
    !["cross-site", "same-site"].includes(request.headers.get("Sec-Fetch-Site") ?? "")
  );
}

export async function formValues(request: Request, max = 32768) {
  const type = request.headers.get("Content-Type")?.split(";")[0]?.trim().toLowerCase();
  if (type !== "application/x-www-form-urlencoded") return { status: 415 as const };
  if (Number(request.headers.get("Content-Length")) > max) return { status: 413 as const };
  const reader = request.body?.getReader();
  if (!reader) return { status: 400 as const };
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let text = "";
  let total = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > max) {
        await reader.cancel();
        return { status: 413 as const };
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } catch {
    return { status: 400 as const };
  } finally {
    reader.releaseLock();
  }
  const values: Record<string, string | undefined> = Object.create(null);
  for (const [key, value] of new URLSearchParams(text)) {
    if (
      !/^[a-zA-Z_][a-zA-Z_0-9]{0,39}$/.test(key) ||
      Object.hasOwn(values, key) ||
      value.includes(String.fromCharCode(0))
    ) {
      return { status: 400 as const };
    }
    values[key] = key === "message" || key === "note" ? value : value.trim();
  }
  return { values };
}

export function analyticsScript(env: Env) {
  const url = httpsUrl(env.PLAUSIBLE_SCRIPT_URL);
  if (
    env.STAGE === "production" &&
    url?.hostname === "plausible.io" &&
    /^\/js\/pa-[a-z0-9_-]+\.js$/i.test(url.pathname) &&
    !url.search &&
    !url.hash
  )
    return url.href;
}

export function securityHeaders(
  response: Response,
  opts: { analytics?: boolean; privatePage?: boolean; noIndex?: boolean },
) {
  const result = new Response(response.body, response);
  const h = result.headers;
  const vendor = opts.analytics ? " https://plausible.io" : "";
  h.set(
    "Content-Security-Policy",
    `default-src 'none'; script-src 'self'${vendor}; connect-src 'self'${vendor}; style-src 'self'; img-src 'self'; font-src 'self'; media-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; object-src 'none'`,
  );
  h.set("X-Content-Type-Options", "nosniff");
  h.set("X-Frame-Options", "DENY");
  h.set("Referrer-Policy", "strict-origin");
  h.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  h.set("Strict-Transport-Security", "max-age=31536000");
  h.set("Cross-Origin-Resource-Policy", "same-origin");
  if (opts.noIndex) h.set("X-Robots-Tag", "noindex, nofollow");
  if (opts.privatePage || response.status >= 400) h.set("Cache-Control", "no-store");
  else if (!h.has("Cache-Control")) h.set("Cache-Control", "public, max-age=0, must-revalidate");
  return result;
}

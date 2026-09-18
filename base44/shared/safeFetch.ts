// Guards outbound fetches of user-supplied file URLs (imports, sheet
// inspection) against SSRF: without this, any authenticated caller could
// point file_url at internal/link-local/loopback addresses and use the
// backend as a probe against infrastructure it shouldn't be able to reach.

function isBlockedIPv4(host: string): boolean {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if ([a, b, Number(m[3]), Number(m[4])].some((n) => n > 255)) return false;
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 127) return true; // loopback
  if (a === 10) return true; // private
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 169 && b === 254) return true; // link-local, incl. cloud metadata (169.254.169.254)
  return false;
}

function isBlockedIPv6(rawHost: string): boolean {
  const host = rawHost.replace(/^\[|\]$/g, "").toLowerCase();
  if (host === "::1" || host === "::") return true; // loopback / unspecified
  if (host.startsWith("fe80:")) return true; // link-local
  if (host.startsWith("fc") || host.startsWith("fd")) return true; // unique local (fc00::/7)
  if (host.startsWith("::ffff:")) return isBlockedIPv4(host.slice("::ffff:".length));
  return false;
}

const BLOCKED_HOSTNAMES = new Set(["localhost", "metadata.google.internal"]);

export function assertPublicHttpUrl(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("file_url invalide");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("file_url doit utiliser http ou https");
  }
  const host = url.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(host) || isBlockedIPv4(host) || isBlockedIPv6(host)) {
    throw new Error("file_url pointe vers une adresse réseau interdite");
  }
  return url;
}

export async function fetchExternalFile(rawUrl: string): Promise<Response> {
  assertPublicHttpUrl(rawUrl);
  return fetch(rawUrl);
}

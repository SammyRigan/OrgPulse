const DEFAULT_LOCAL_BASE_URL = "http://localhost:3000";

function firstHeaderValue(value: string | null): string | null {
  if (!value) return null;
  const first = value.split(",")[0]?.trim();
  return first || null;
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function getServerBaseUrl(request: Request): string {
  const configuredBaseUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (configuredBaseUrl) {
    return stripTrailingSlash(configuredBaseUrl);
  }

  const requestUrl = new URL(request.url);
  const protocol = firstHeaderValue(request.headers.get("x-forwarded-proto"))
    ?? requestUrl.protocol.replace(":", "");
  const host =
    firstHeaderValue(request.headers.get("x-forwarded-host"))
    ?? request.headers.get("host")
    ?? requestUrl.host;

  if (!host) return DEFAULT_LOCAL_BASE_URL;
  return `${protocol}://${host}`;
}

/**
 * The site's public address. NEXT_PUBLIC_SITE_URL wins when set (e.g. a
 * custom domain). On Vercel it falls back to the production address Vercel
 * provides, so a fresh deploy works without extra settings.
 */
export function configuredSiteUrl(): string | null {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return null;
}

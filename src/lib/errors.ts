/**
 * Database triggers raise plain-English messages meant for members
 * (e.g. "You can have up to 2 active job posts. Close one first.").
 * Show those as-is; hide anything technical behind the fallback.
 */
export function friendlyDbError(error: { message: string } | null | undefined, fallback: string): string | null {
  if (!error) return null;
  const technical = /violates|permission|policy|syntax|column|relation|function|null value|invalid input|duplicate key/i;
  return /^[A-Z].*[.!]$/.test(error.message) && !technical.test(error.message) ? error.message : fallback;
}

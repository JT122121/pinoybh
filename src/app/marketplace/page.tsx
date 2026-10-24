import { Browse } from "@/components/Browse";
import { parseFilters } from "@/lib/posts";

export const metadata = { title: "Marketplace" };

export default async function MarketplacePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = parseFilters(await searchParams, "listing");
  return <Browse kind="listing" filters={filters} basePath="/marketplace" />;
}

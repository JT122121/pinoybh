import { Browse } from "@/components/Browse";
import { parseFilters } from "@/lib/posts";

export const metadata = { title: "Jobs" };

export default async function JobsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = parseFilters(await searchParams, "job");
  return <Browse kind="job" filters={filters} basePath="/jobs" />;
}

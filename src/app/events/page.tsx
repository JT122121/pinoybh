import { Browse } from "@/components/Browse";
import { parseFilters } from "@/lib/posts";

export const metadata = { title: "Events" };

export default async function EventsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = parseFilters(await searchParams, "event");
  return <Browse kind="event" filters={filters} basePath="/events" />;
}

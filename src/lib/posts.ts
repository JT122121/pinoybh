import { createClient } from "./supabase/server";
import type { Category, PostKind, PostWithExtras } from "./types";

export const POST_SELECT =
  "*, author:profiles!posts_author_id_fkey(id, display_name, is_verified, avatar_path, area), photos:post_photos(path, position), comment_count:comments(count)";

export function sortPhotos<T extends { photos: { position: number }[] }>(post: T): T {
  return { ...post, photos: [...(post.photos ?? [])].sort((a, b) => a.position - b.position) };
}

export async function getCategories(kind?: PostKind): Promise<Category[]> {
  const supabase = await createClient();
  let query = supabase.from("categories").select("*").order("sort_order");
  if (kind) query = query.eq("kind", kind);
  const { data } = await query;
  return (data ?? []) as Category[];
}

export interface SearchFilters {
  q?: string;
  kind?: PostKind;
  category?: string;
  area?: string;
  min?: number;
  max?: number;
  verified?: boolean;
  page?: number;
}

export const PAGE_SIZE = 24;

export async function searchPosts(filters: SearchFilters): Promise<PostWithExtras[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("search_posts", {
      p_query: filters.q || null,
      p_kind: filters.kind ?? null,
      p_category: filters.category || null,
      p_area: filters.area || null,
      p_min_price: filters.min ?? null,
      p_max_price: filters.max ?? null,
      p_verified_only: filters.verified ?? false,
      p_limit: PAGE_SIZE + 1,
      p_offset: ((filters.page ?? 1) - 1) * PAGE_SIZE,
    })
    .select(POST_SELECT);
  if (error) throw error;
  return ((data ?? []) as unknown as PostWithExtras[]).map(sortPhotos);
}

/** Reads ?q=&category=... into typed filters. */
export function parseFilters(params: Record<string, string | string[] | undefined>, kind: PostKind): SearchFilters {
  const one = (key: string) => {
    const v = params[key];
    return (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
  };
  const num = (key: string) => {
    const v = one(key);
    const n = v === undefined ? NaN : Number(v);
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  };
  return {
    kind,
    q: one("q")?.slice(0, 80),
    category: one("category"),
    area: one("area"),
    min: num("min"),
    max: num("max"),
    verified: one("verified") === "1",
    page: Math.max(1, Math.floor(num("page") ?? 1)),
  };
}

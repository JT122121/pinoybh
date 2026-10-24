import { PostForm } from "@/components/PostForm";
import { getCategories } from "@/lib/posts";
import { requireViewer } from "@/lib/viewer";

export const metadata = { title: "New post" };

export default async function NewPostPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind } = await searchParams;
  const viewer = await requireViewer(`/posts/new${kind ? `?kind=${kind}` : ""}`);
  const categories = await getCategories();
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="display text-4xl">New post</h1>
      <p className="mt-3 text-muted">Be honest and clear. Posts are for individuals and community groups, not businesses or agencies.</p>
      <div className="panel mt-6 p-5 sm:p-6">
        <PostForm
          userId={viewer.userId}
          postId={crypto.randomUUID()}
          categories={categories}
          defaultArea={viewer.profile.area}
          initialKind={kind === "job" || kind === "event" ? kind : "listing"}
        />
      </div>
    </div>
  );
}

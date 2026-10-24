import { notFound } from "next/navigation";
import { PostForm } from "@/components/PostForm";
import { getCategories } from "@/lib/posts";
import { createClient } from "@/lib/supabase/server";
import type { ContactMethod, Post } from "@/lib/types";
import { requireViewer } from "@/lib/viewer";

export const metadata = { title: "Edit post" };

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireViewer(`/posts/${id}/edit`);
  const supabase = await createClient();
  const { data: post } = await supabase.from("posts").select("*").eq("id", id).eq("author_id", viewer.userId).maybeSingle<Post>();
  if (!post) notFound();
  const [{ data: photos }, { data: contact }, categories] = await Promise.all([
    supabase.from("post_photos").select("path").eq("post_id", id).order("position"),
    supabase.from("post_contacts").select("method, value").eq("post_id", id).maybeSingle(),
    getCategories(),
  ]);
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="display text-4xl">Edit post</h1>
      <div className="panel mt-6 p-5 sm:p-6">
        <PostForm
          userId={viewer.userId}
          postId={post.id}
          categories={categories}
          defaultArea={viewer.profile.area}
          initialKind={post.kind}
          existing={{
            post,
            photos: (photos ?? []).map((p) => p.path),
            contact: contact as { method: ContactMethod; value: string } | null,
          }}
        />
      </div>
    </div>
  );
}

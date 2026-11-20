"use client";

import { useParams } from "next/navigation";
import { useApi } from "@/lib/use-api";
import type { AdminBlogPost } from "@/lib/types";
import { LoadState } from "@/components/panel/page";
import { BlogEditor } from "../../../_components/blog-editor";

export default function EditBlogPostPage() {
  const { id } = useParams<{ id: string }>();
  const { data, error, loading, refetch } = useApi<AdminBlogPost>(`/admin/blog/${id}`);
  return (
    <LoadState loading={loading && !data} error={error} onRetry={refetch} rows={8}>
      {/* key: remount the editor when switching posts */}
      {data && <BlogEditor key={data.id} post={data} />}
    </LoadState>
  );
}

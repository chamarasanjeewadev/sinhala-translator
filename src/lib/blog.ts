export type { PostMeta as Post } from "./blog-data";
export { getAllPostsMeta as getAllPosts } from "./blog-data";

import { getPostMetaBySlug, type PostMeta } from "./blog-data";

export function getPostBySlug(slug: string): PostMeta {
  const post = getPostMetaBySlug(slug);
  if (!post) {
    throw new Error(`Post not found: ${slug}`);
  }
  return post;
}


import { getAllPosts } from "../src/lib/blog";

try {
  console.log("Checking blog posts...");
  const posts = getAllPosts();
  console.log(`Found ${posts.length} posts.`);
  posts.forEach(p => console.log(`- ${p.title} (${p.slug}) [${p.language}]`));
} catch (error) {
  console.error("Error fetching posts:", error);
}

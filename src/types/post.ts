export type PostImage = { id: string; url: string; width: number | null; height: number | null };
export type PostCategory = 'article' | 'encyclopedia';
export type Post = {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage: string | null;
  createdAt: string;
  category: PostCategory;
  images: PostImage[];
  collectionCount: number;
  collected: boolean;
};
export type PostPage = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: Post[];
};
export type CollectionResult = { post_id: string; collected: boolean; collectionCount: number };
export type CollectionCategory = PostCategory;
export type PostApi = {
  list: (page: number) => Promise<PostPage>;
  detail: (id: string) => Promise<Post>;
  collect: (id: string, collected: boolean) => Promise<CollectionResult>;
};

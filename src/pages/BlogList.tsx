import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Calendar, User, Loader, Newspaper, X, Hash } from 'lucide-react';
import { supabase, BlogPost } from '../lib/supabase';

export default function BlogList() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('is_published', true)
        .order('published_at', { ascending: false });
      setPosts((data as BlogPost[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.author_name.toLowerCase().includes(q) ||
        (p.hashtags ?? []).some((t) => t.toLowerCase().includes(q))
    );
  }, [posts, search]);

  return (
    <div className="page-enter">
      {/* Hero header */}
      <div className="bg-navy-950 py-12 md:py-16">
        <div className="page-container max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-gold-500/20 text-gold-400 rounded-full text-xs font-semibold uppercase tracking-wide mb-4">
            <Newspaper className="w-3.5 h-3.5" /> Blog & Articles
          </div>
          <h1 className="text-3xl md:text-5xl font-serif font-bold text-white mb-3">
            Articles & Reflections
          </h1>
          <p className="text-slate-300 text-sm md:text-base max-w-xl mx-auto">
            Explore writings from our faculty and staff on theology, ministry, and Christian life.
          </p>
        </div>
      </div>

      <div className="page-container max-w-4xl py-8 md:py-12">
        {/* Search bar */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, author, or hashtag..."
            className="w-full pl-12 pr-12 py-3.5 bg-white border border-slate-200 rounded-xl text-sm text-navy-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-transparent shadow-sm"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Results count */}
        <p className="text-sm text-slate-500 mb-6">
          {loading ? 'Loading...' : `${filtered.length} article${filtered.length !== 1 ? 's' : ''}${search ? ` found` : ''}`}
        </p>

        {/* Posts */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader className="w-8 h-8 text-navy-700 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Newspaper className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">
              {search ? 'No articles match your search.' : 'No articles have been published yet.'}
            </p>
            {search && (
              <button onClick={() => setSearch('')} className="mt-4 text-gold-600 hover:text-gold-700 text-sm font-medium">
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {filtered.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BlogCard({ post }: { post: BlogPost }) {
  const previewText = (post.intro_text || post.body_text || post.conclusion_text || '')
    .replace(/<[^>]*>/g, '')
    .replace(/[#*]/g, '')
    .split('\n')[0]
    .slice(0, 140);
  const dateStr = post.published_at
    ? new Date(post.published_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : new Date(post.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <Link
      to={`/post/${post.slug}`}
      className="group block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg hover:border-navy-200 transition-all duration-300"
    >
      {post.featured_image_url ? (
        <div className="relative h-48 overflow-hidden">
          <img
            src={post.featured_image_url}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        </div>
      ) : (
        <div className="h-32 bg-gradient-to-br from-navy-800 to-navy-950 flex items-center justify-center">
          <Newspaper className="w-10 h-10 text-gold-500/40" />
        </div>
      )}
      <div className="p-5">
        {post.hashtags && post.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {post.hashtags.slice(0, 2).map((tag) => (
              <span key={tag} className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-gold-100 text-gold-700 text-[11px] font-semibold rounded-full">
                <Hash className="w-2.5 h-2.5" />{tag}
              </span>
            ))}
          </div>
        )}
        <h3 className="font-serif font-bold text-navy-900 text-lg leading-snug mb-2 group-hover:text-gold-600 transition-colors line-clamp-2">
          {post.title}
        </h3>
        <p className="text-sm text-slate-500 line-clamp-2 mb-3">{previewText}</p>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-gold-500" />{post.author_name}
          </span>
          <span className="inline-flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-gold-500" />{dateStr}
          </span>
        </div>
      </div>
    </Link>
  );
}

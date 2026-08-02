import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Calendar, User, Eye, ArrowLeft, Share2, Check, Loader, Newspaper, Hash, Youtube, Lightbulb,
} from 'lucide-react';
import { supabase, BlogPost } from '../lib/supabase';

function getYouTubeEmbedUrl(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
  }
  return null;
}

function formatText(html: string | null): string {
  if (!html) return '';
  return html;
}

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadPost = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);

    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .eq('is_published', true)
      .maybeSingle();

    if (error || !data) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setPost(data as BlogPost);
    setLoading(false);

    // Increment view count (fire-and-forget)
    try {
      await supabase.rpc('increment_blog_post_view', { post_slug: slug });
      setPost((prev) => prev ? { ...prev, view_count: prev.view_count + 1 } : prev);
    } catch {
      // View count increment is non-critical
    }
  }, [slug]);

  useEffect(() => {
    loadPost();
  }, [loadPost]);

  function handleShare() {
    if (!post) return;
    const url = `${window.location.origin}/post/${post.slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader className="w-8 h-8 text-navy-700 animate-spin" />
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
        <Newspaper className="w-16 h-16 text-slate-300 mb-4" />
        <h1 className="text-2xl font-serif font-bold text-navy-900 mb-2">Article Not Found</h1>
        <p className="text-slate-500 mb-6">This article may have been removed or is no longer published.</p>
        <Link to="/blog" className="btn-primary">
          <ArrowLeft className="w-4 h-4" /> Back to Blog
        </Link>
      </div>
    );
  }

  const dateStr = post.published_at
    ? new Date(post.published_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date(post.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  const youtubeEmbed = post.youtube_url ? getYouTubeEmbedUrl(post.youtube_url) : null;

  return (
    <div className="page-enter min-h-screen bg-slate-50">
      {/* Hero header */}
      <div className="bg-navy-950 py-10 md:py-14">
        <div className="page-container max-w-3xl">
          <Link to="/blog" className="inline-flex items-center gap-2 text-slate-400 hover:text-gold-400 text-sm transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" /> All Articles
          </Link>

          {/* Hashtags */}
          {post.hashtags && post.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {post.hashtags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-0.5 px-2.5 py-1 bg-gold-500/20 text-gold-300 text-xs font-semibold rounded-full">
                  <Hash className="w-2.5 h-2.5" />{tag}
                </span>
              ))}
            </div>
          )}

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-white leading-tight mb-4">
            {post.title}
          </h1>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <User className="w-4 h-4 text-gold-400" /> {post.author_name}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-gold-400" /> {dateStr}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-gold-400" /> {(post.view_count ?? 0).toLocaleString('en-IN')} views
            </span>
            <button
              onClick={handleShare}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${copied ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-slate-300 hover:bg-white/20'}`}
            >
              {copied ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Share2 className="w-3.5 h-3.5" /> Share</>}
            </button>
          </div>
        </div>
      </div>

      {/* Featured Image */}
      {post.featured_image_url && (
        <div className="page-container max-w-3xl -mt-6 md:-mt-8 relative z-10">
          <img
            src={post.featured_image_url}
            alt={post.title}
            className="w-full h-64 md:h-96 object-cover rounded-2xl shadow-xl"
          />
        </div>
      )}

      {/* Article body */}
      <div className="page-container max-w-3xl py-10 md:py-14">
        <div className="space-y-10">
          {/* Introduction + Featured image float (if no hero above) */}
          {post.intro_text && (
            <section>
              {post.featured_image_url && (
                <img
                  src={post.featured_image_url}
                  alt={post.title}
                  className="hidden"
                />
              )}
              <div
                className="prose prose-lg max-w-none text-slate-700 leading-relaxed [&_p]:mb-4 [&_p:last-child]:mb-0"
                dangerouslySetInnerHTML={{ __html: formatText(post.intro_text) }}
              />
            </section>
          )}

          {/* Supporting Image */}
          {post.supporting_image_url && (
            <div className="rounded-2xl overflow-hidden shadow-lg">
              <img
                src={post.supporting_image_url}
                alt={post.title}
                className="w-full h-64 md:h-80 object-cover"
              />
            </div>
          )}

          {/* Main Body */}
          {post.body_text && (
            <section>
              <div
                className="prose prose-lg max-w-none text-slate-700 leading-relaxed [&_p]:mb-4 [&_p:last-child]:mb-0"
                dangerouslySetInnerHTML={{ __html: formatText(post.body_text) }}
              />
            </section>
          )}

          {/* Second Image */}
          {post.second_image_url && (
            <div className="rounded-2xl overflow-hidden shadow-lg">
              <img
                src={post.second_image_url}
                alt={post.title}
                className="w-full h-64 md:h-80 object-cover"
              />
            </div>
          )}

          {/* Conclusion */}
          {post.conclusion_text && (
            <section>
              <div
                className="prose prose-lg max-w-none text-slate-700 leading-relaxed [&_p]:mb-4 [&_p:last-child]:mb-0"
                dangerouslySetInnerHTML={{ __html: formatText(post.conclusion_text) }}
              />
            </section>
          )}

          {/* YouTube embed */}
          {youtubeEmbed && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Youtube className="w-5 h-5 text-red-500" />
                <h3 className="font-serif font-bold text-navy-900">Video</h3>
              </div>
              <div className="relative w-full rounded-2xl overflow-hidden shadow-lg" style={{ paddingBottom: '56.25%' }}>
                <iframe
                  src={youtubeEmbed}
                  title={post.title}
                  className="absolute inset-0 w-full h-full"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </section>
          )}

          {/* Takeaway */}
          {post.takeaway && (
            <section className="bg-gradient-to-br from-navy-50 to-gold-50 border border-gold-200 rounded-2xl p-6 md:p-8">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gold-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Lightbulb className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-navy-900 text-lg mb-2">Key Takeaway</h3>
                  <p className="text-slate-700 leading-relaxed">{post.takeaway}</p>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Author footer */}
        <div className="mt-12 pt-8 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-navy-100 flex items-center justify-center">
              <span className="text-navy-700 font-bold text-lg">{post.author_name[0]?.toUpperCase()}</span>
            </div>
            <div>
              <p className="font-semibold text-navy-900 text-sm">{post.author_name}</p>
              <p className="text-slate-500 text-xs">Author</p>
            </div>
          </div>
          <Link to="/blog" className="btn-secondary text-sm">
            <ArrowLeft className="w-4 h-4" /> More Articles
          </Link>
        </div>
      </div>
    </div>
  );
}

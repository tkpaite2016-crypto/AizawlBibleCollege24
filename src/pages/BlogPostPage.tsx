import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, User, Loader, AlertCircle, Hash, X, Youtube } from 'lucide-react';
import { supabase, BlogPost } from '../lib/supabase';

function renderParagraphs(text: string | null): string[] {
  if (!text) return [];
  return text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}

function stripHtml(text: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = text;
  return tmp.textContent || tmp.innerText || '';
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} minute${min !== 1 ? 's' : ''} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr !== 1 ? 's' : ''} ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} day${day !== 1 ? 's' : ''} ago`;
  const week = Math.floor(day / 7);
  if (week < 4) return `${week} week${week !== 1 ? 's' : ''} ago`;
  const month = Math.floor(day / 30);
  if (month < 12) return `${month} month${month !== 1 ? 's' : ''} ago`;
  const year = Math.floor(day / 365);
  return `${year} year${year !== 1 ? 's' : ''} ago`;
}

function getYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export default function BlogPostPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      const { data, error: loadErr } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .maybeSingle();
      if (loadErr) { setError(loadErr.message); setLoading(false); return; }
      if (!data) { setError('Post not found.'); setLoading(false); return; }
      setPost(data as BlogPost);
      setLoading(false);
    })();
  }, [slug]);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightbox(null); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [lightbox]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-8 h-8 text-navy-700 animate-spin" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h1 className="text-2xl font-serif font-bold text-navy-900 mb-2">{error || 'Post not found'}</h1>
          <p className="text-slate-500 mb-6">The post you're looking for doesn't exist or has been removed.</p>
          <Link to="/" className="btn-primary inline-flex"><ArrowLeft className="w-4 h-4" /> Back to Home</Link>
        </div>
      </div>
    );
  }

  const introParas = renderParagraphs(post.intro_text);
  const bodyParas = renderParagraphs(post.body_text);
  const conclusionParas = renderParagraphs(post.conclusion_text);
  const ytId = post.youtube_url ? getYouTubeId(post.youtube_url) : null;

  return (
    <article className="page-enter">
      <div className="page-container py-10 md:py-14 max-w-3xl">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-slate-500 hover:text-navy-700 text-sm mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Hashtags */}
        {post.hashtags && post.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {post.hashtags.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 bg-gold-100 text-gold-700 text-xs font-semibold rounded-full">
                <Hash className="w-3 h-3" />{tag}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <h1 className="text-3xl md:text-5xl font-serif font-bold text-navy-900 leading-tight mb-3">
          {post.title}
        </h1>

        {/* Metadata bar — moved under the title */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 mb-6">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-gold-500" />
            {post.published_at
              ? new Date(post.published_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
              : new Date(post.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <User className="w-4 h-4 text-gold-500" />
            {post.author_name}
          </span>
        </div>

        {/* YouTube embed — 45% width, only fullscreen enabled */}
        {ytId && (
          <div className="mb-8 flex justify-center">
            <div className="w-[45%] rounded-2xl overflow-hidden shadow-lg" style={{ aspectRatio: '16 / 9' }}>
              <iframe
                src={`https://www.youtube.com/embed/${ytId}?controls=0&modestbranding=1&rel=0`}
                title={post.title}
                className="w-full h-full"
                allow="fullscreen"
                allowFullScreen
              />
            </div>
          </div>
        )}

        {/* Featured image (left) + Intro text (right) with wrap */}
        {post.featured_image_url && introParas.length > 0 ? (
          <div className="mb-8 clearfix">
            <figure className="float-left mr-6 mb-4 w-[35%]">
              <img
                src={post.featured_image_url}
                alt={post.title}
                className="w-full rounded-2xl shadow-lg object-cover cursor-zoom-in transition-transform hover:scale-[1.01]"
                onClick={() => setLightbox(post.featured_image_url!)}
              />
            </figure>
            <div className="space-y-4">
              {introParas.map((p, i) => (
                <p key={i} className="text-slate-700 leading-relaxed text-lg" dangerouslySetInnerHTML={{ __html: p }} />
              ))}
            </div>
          </div>
        ) : (
          <>
            {post.featured_image_url && (
              <figure className="mb-8">
                <img
                  src={post.featured_image_url}
                  alt={post.title}
                  className="w-full rounded-2xl shadow-lg object-cover max-h-[400px] cursor-zoom-in transition-transform hover:scale-[1.01]"
                  onClick={() => setLightbox(post.featured_image_url!)}
                />
              </figure>
            )}
            {introParas.length > 0 && (
              <div className="space-y-4 mb-8">
                {introParas.map((p, i) => (
                  <p key={i} className="text-slate-700 leading-relaxed text-lg" dangerouslySetInnerHTML={{ __html: p }} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Supporting image (right) + Body text (left) with wrap */}
        {post.supporting_image_url && bodyParas.length > 0 ? (
          <div className="mb-8 clearfix">
            <figure className="float-right ml-6 mb-4 w-[35%]">
              <img
                src={post.supporting_image_url}
                alt={post.title}
                className="w-full rounded-2xl shadow-lg object-cover cursor-zoom-in transition-transform hover:scale-[1.01]"
                onClick={() => setLightbox(post.supporting_image_url!)}
              />
            </figure>
            <div className="space-y-4">
              {bodyParas.map((p, i) => (
                <p key={i} className="text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: p }} />
              ))}
            </div>
          </div>
        ) : (
          <>
            {post.supporting_image_url && (
              <figure className="my-10 flex justify-end">
                <img
                  src={post.supporting_image_url}
                  alt={post.title}
                  className="w-full md:w-3/4 rounded-2xl shadow-lg object-cover max-h-[400px] cursor-zoom-in transition-transform hover:scale-[1.01]"
                  onClick={() => setLightbox(post.supporting_image_url!)}
                />
              </figure>
            )}
            {bodyParas.length > 0 && (
              <div className="space-y-4 mb-8">
                {bodyParas.map((p, i) => (
                  <p key={i} className="text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: p }} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Second image (left) + Conclusion text (right) with wrap */}
        {post.second_image_url && conclusionParas.length > 0 ? (
          <div className="mb-8 clearfix">
            <figure className="float-left mr-6 mb-4 w-[35%]">
              <img
                src={post.second_image_url}
                alt={post.title}
                className="w-full rounded-2xl shadow-lg object-cover cursor-zoom-in transition-transform hover:scale-[1.01]"
                onClick={() => setLightbox(post.second_image_url!)}
              />
            </figure>
            <div className="space-y-4">
              {conclusionParas.map((p, i) => (
                <p key={i} className="text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: p }} />
              ))}
            </div>
          </div>
        ) : (
          <>
            {post.second_image_url && (
              <figure className="my-10 flex justify-start">
                <img
                  src={post.second_image_url}
                  alt={post.title}
                  className="w-full md:w-3/4 rounded-2xl shadow-lg object-cover max-h-[400px] cursor-zoom-in transition-transform hover:scale-[1.01]"
                  onClick={() => setLightbox(post.second_image_url!)}
                />
              </figure>
            )}
            {conclusionParas.length > 0 && (
              <div className="space-y-4 mb-8">
                {conclusionParas.map((p, i) => (
                  <p key={i} className="text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: p }} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Takeaway */}
        {post.takeaway && (
          <div className="my-10 p-6 bg-navy-50 border-l-4 border-gold-500 rounded-r-xl">
            <p className="text-navy-900 font-serif text-lg italic leading-relaxed">{post.takeaway}</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link to="/" className="btn-secondary"><ArrowLeft className="w-4 h-4" /> Back to Home</Link>
          <p className="text-sm text-slate-500">By {post.author_name}</p>
        </div>
      </div>

      {/* Fullscreen image viewer */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 cursor-zoom-out"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors"
            onClick={() => setLightbox(null)}
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={lightbox}
            alt="Full view"
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </article>
  );
}

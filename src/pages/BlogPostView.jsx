import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import HeaderBar from '../components/HeaderBar';
import Footer from '../components/Footer';
import { usePageColor } from '../hooks/usePageColor';
import { supabase } from '../lib/supabase';
import './Blog.css';

export default function BlogPostView() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  usePageColor('#ffde00');

  useEffect(() => {
    async function fetchPost() {
      try {
        const { data, error } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('slug', slug)
          .single();

        // Fallback for older posts that might not have a slug and were routed by ID
        if (error && error.code === 'PGRST116') {
          const { data: idData, error: idError } = await supabase
            .from('blog_posts')
            .select('*')
            .eq('id', slug)
            .single();
            
          if (!idError) {
            setPost(idData);
            return;
          }
        } else if (error) {
          throw error;
        }

        setPost(data);
      } catch (error) {
        console.error('Failed to load blog post:', error);
      } finally {
        setLoading(false);
      }
    }
    
    if (slug) {
      fetchPost();
    }
  }, [slug]);

  return (
    <div className="page-container">
      <HeaderBar />
      <div className="page-content blog-content">
        <div className="page-header">
          <div className="page-header-rect" style={{ backgroundColor: '#ffde00' }} />
          <h1 className="page-title blog-title">BLOG</h1>
        </div>

        <div className="blog-layout theme-shell-section" style={{ maxWidth: '800px', margin: '0 auto' }}>
          {loading ? (
            <p className="loading-text" style={{ textAlign: 'center', margin: '50px 0', fontFamily: 'Gantari', color: '#000', letterSpacing: '0.1em', fontWeight: '600' }}>LOADING POST...</p>
          ) : !post ? (
            <div style={{ textAlign: 'center', margin: '50px 0' }}>
              <p className="loading-text" style={{ fontFamily: 'Gantari', letterSpacing: '0.1em', fontWeight: '600', marginBottom: '20px' }}>POST NOT FOUND.</p>
              <Link to="/blog" style={{ color: '#ffde00', textDecoration: 'none', fontWeight: 'bold' }}>← BACK TO BLOG</Link>
            </div>
          ) : (
            <article className="blog-post-card" style={{ padding: '40px', background: 'transparent', border: 'none', boxShadow: 'none' }}>
              <div style={{ marginBottom: '30px' }}>
                <Link to="/blog" style={{ color: '#ffde00', textDecoration: 'none', fontWeight: 'bold', fontSize: '12px', letterSpacing: '0.1em' }}>← BACK TO BLOG</Link>
              </div>
              <h1 className="post-title" style={{ fontSize: '32px', marginBottom: '15px' }}>{post.title}</h1>
              <div className="post-meta" style={{ marginBottom: '40px', borderBottom: '1px solid #eee', paddingBottom: '20px' }}>
                <span className="post-author">{post.author || 'LMNL'}</span>
                <span className="post-date">{new Date(post.created_at).toLocaleDateString()}</span>
              </div>
              <div className="post-content" style={{ whiteSpace: 'pre-wrap', fontSize: '16px', lineHeight: '1.8' }}>
                {post.content}
              </div>
            </article>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ContentPageShell from '../components/ContentPageShell';
import { supabase } from '../lib/supabase';
import './Blog.css';

export default function Blog() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPosts() {
      try {
        const { data, error } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('status', 'published')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setPosts(data || []);
      } catch (error) {
        console.error('Failed to load blog posts:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchPosts();
  }, []);

  return (
    <ContentPageShell title="BLOG" color="#ffde00" contentClassName="blog-content">
      <div className="blog-layout">
        {loading ? (
          <p className="loading-text" style={{ textAlign: 'center', margin: '50px 0', fontFamily: 'Gantari', color: '#000', letterSpacing: '0.1em', fontWeight: '600' }}>LOADING POSTS...</p>
        ) : posts.length === 0 ? (
          <p className="loading-text" style={{ textAlign: 'center', margin: '50px 0', fontFamily: 'Gantari', letterSpacing: '0.1em', fontWeight: '600' }}>NO POSTS FOUND.</p>
        ) : (
          <div className="blog-posts-grid">
            {posts.map(post => (
              <Link to={`/blog/${post.slug || post.id}`} key={post.id} className="blog-post-card" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                <h2 className="post-title" style={{ transition: 'color 0.2s' }}>{post.title}</h2>
                <div className="post-meta">
                  <span className="post-author">{post.author || 'LMNL'}</span>
                  <span className="post-date">{post.date ? new Date(post.date).toLocaleDateString('en-US', { timeZone: 'UTC' }) : new Date(post.created_at).toLocaleDateString()}</span>
                </div>
                <div className="post-content" style={{ maxHeight: '100px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                  {post.content}
                </div>
                <div className="post-read-more" style={{ marginTop: '15px', color: '#ffde00', fontWeight: 'bold', fontSize: '12px', letterSpacing: '0.1em' }}>
                  READ MORE ↗
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </ContentPageShell>
  );
}

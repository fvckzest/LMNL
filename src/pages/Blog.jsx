import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ContentPageShell, { PageEmptyState, PageStatus } from '../components/ContentPageShell';
import SystemPanel from '../components/SystemPanel';
import { supabase } from '../lib/supabase';
import './Blog.css';

function BlogSidebar({ posts, loading }) {
  const latestDate = posts[0]
    ? new Date(posts[0].date || posts[0].created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toUpperCase()
    : '---';

  return (
    <>
      <SystemPanel title="ARCHIVE INDEX">
        <div className="terminal-metric-list">
          <div className="terminal-metric-row"><span>RECORDS</span><span>{loading ? '---' : String(posts.length).padStart(2, '0')}</span></div>
          <div className="terminal-metric-row"><span>STATE</span><span>{loading ? 'SYNCING' : 'LIVE'}</span></div>
          <div className="terminal-metric-row"><span>LATEST</span><span>{latestDate}</span></div>
        </div>
      </SystemPanel>

      <SystemPanel title="ARCHIVE MODE">
        <div className="blog-sidebar-copy">
          <p>Field notes, releases, and transmissions are logged here as indexed records.</p>
          <p>Open any record to enter the full transmission view.</p>
        </div>
      </SystemPanel>
    </>
  );
}

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
    <ContentPageShell
      title="BLOG"
      color="#ffde00"
      introTitle="BLOG"
      introCopy="TRANSMISSIONS, WRITING, AND SYSTEM LOGS"
      rightSidebar={<BlogSidebar posts={posts} loading={loading} />}
      contentClassName="blog-content page-stack"
    >
      <div className="blog-layout">
        {loading ? (
          <PageStatus>LOADING POSTS...</PageStatus>
        ) : posts.length === 0 ? (
          <PageEmptyState>NO POSTS FOUND.</PageEmptyState>
        ) : (
          <div className="blog-posts-grid">
            {posts.map(post => (
              <Link to={`/blog/${post.slug || post.id}`} key={post.id} className="blog-post-card">
                <div className="post-meta">
                  <span className="post-index">TRANSMISSION</span>
                  <span className="post-date">{post.date ? new Date(post.date).toLocaleDateString('en-US', { timeZone: 'UTC' }) : new Date(post.created_at).toLocaleDateString()}</span>
                </div>
                <h2 className="post-title">{post.title}</h2>
                <div className="post-content post-content--clamped">
                  {post.content}
                </div>
                <div className="post-read-more">
                  <span>{post.author || 'LMNL'}</span>
                  <span>OPEN RECORD ↗</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </ContentPageShell>
  );
}

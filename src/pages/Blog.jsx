import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ContentPageShell, { PageEmptyState, PageStatus } from '../components/ContentPageShell';
import { fetchPublishedBlogPosts } from '../lib/siteData';
import './Blog.css';

export default function Blog() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPosts() {
      try {
        const data = await fetchPublishedBlogPosts();
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

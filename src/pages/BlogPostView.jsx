import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ContentPageShell, { PageEmptyState, PageStatus } from '../components/ContentPageShell';
import { fetchPublishedBlogPost } from '../lib/siteData';
import './Blog.css';

export default function BlogPostView() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPost() {
      try {
        const data = await fetchPublishedBlogPost(slug);
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
    <ContentPageShell
      title="BLOG"
      color="#ffde00"
      introTitle="BLOG"
      introCopy="SINGLE TRANSMISSION / FULL RECORD"
      contentClassName="blog-content page-stack"
    >
      <div className="blog-layout">
        {loading ? (
          <PageStatus>LOADING POST...</PageStatus>
        ) : !post ? (
          <div className="page-panel blog-post-empty">
            <PageEmptyState>POST NOT FOUND.</PageEmptyState>
            <Link to="/blog" className="page-inline-link blog-back-link">← BACK TO BLOG</Link>
          </div>
        ) : (
          <article className="page-detail-pane page-detail-pane--accent blog-post-view">
            <div className="blog-post-view__topline">
              <Link to="/blog" className="page-inline-link blog-back-link">← BACK TO BLOG</Link>
            </div>
            <div className="post-meta post-meta--record">
              <span className="post-index">TRANSMISSION</span>
              <span>{post.author || 'LMNL'}</span>
              <span>{post.date ? new Date(post.date).toLocaleDateString('en-US', { timeZone: 'UTC' }) : new Date(post.created_at).toLocaleDateString()}</span>
            </div>
            <h2 className="page-panel-title">{post.title}</h2>
            <div className="post-content post-content--full">{post.content}</div>
          </article>
        )}
      </div>
    </ContentPageShell>
  );
}

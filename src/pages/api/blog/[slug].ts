export const prerender = false;
import type { APIRoute } from 'astro';

export const GET: APIRoute = async (context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const db = (context.locals as any).runtime?.env?.DB;
    if (!db) {
      return new Response(JSON.stringify({ error: 'Database not configured' }), { status: 500, headers });
    }

    const slug = context.params.slug;
    
    if (!slug) {
      return new Response(JSON.stringify({ error: 'Slug is required' }), { status: 400, headers });
    }

    const post = await db.prepare('SELECT * FROM blog_posts WHERE slug = ?').bind(slug).first();

    if (!post) {
      return new Response(JSON.stringify({ error: 'Post not found' }), { status: 404, headers });
    }

    // Increment view count in background
    context.waitUntil(
      db.prepare('UPDATE blog_posts SET view_count = view_count + 1 WHERE slug = ?').bind(slug).run()
    );

    return new Response(JSON.stringify(post), { status: 200, headers });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
  }
};

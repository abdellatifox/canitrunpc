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

    const url = new URL(context.request.url);
    const category = url.searchParams.get('category');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '12', 10), 24);
    const page = Math.max(parseInt(url.searchParams.get('page') || '1', 10), 1);
    const offset = (page - 1) * limit;

    let totalQuery, dataQuery, totalRes, dataRes;
    
    if (category) {
      totalQuery = db.prepare('SELECT COUNT(*) as total FROM blog_posts WHERE category = ?').bind(category);
      dataQuery = db.prepare('SELECT id, title, slug, excerpt, category, author, image_url, read_time, view_count, featured, published_at FROM blog_posts WHERE category = ? ORDER BY featured DESC, published_at DESC LIMIT ? OFFSET ?').bind(category, limit, offset);
    } else {
      totalQuery = db.prepare('SELECT COUNT(*) as total FROM blog_posts');
      dataQuery = db.prepare('SELECT id, title, slug, excerpt, category, author, image_url, read_time, view_count, featured, published_at FROM blog_posts ORDER BY featured DESC, published_at DESC LIMIT ? OFFSET ?').bind(limit, offset);
    }

    totalRes = await totalQuery.first();
    dataRes = await dataQuery.all();

    const total = totalRes?.total || 0;
    const pages = Math.ceil(total / limit);

    return new Response(JSON.stringify({
      data: dataRes.results,
      total,
      page,
      pages,
      category
    }), { status: 200, headers });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
  }
};

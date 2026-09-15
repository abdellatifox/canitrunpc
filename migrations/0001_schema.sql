CREATE TABLE IF NOT EXISTS gpus (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  score INTEGER NOT NULL,
  vram_gb INTEGER,
  tier TEXT,
  release_year INTEGER,
  msrp_usd INTEGER,
  supports_dlss INTEGER DEFAULT 0,
  supports_fsr INTEGER DEFAULT 1,
  supports_xess INTEGER DEFAULT 0,
  supports_ray_tracing INTEGER DEFAULT 0,
  tdp_watts INTEGER,
  slug TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS cpus (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  score INTEGER NOT NULL,
  cores INTEGER,
  threads INTEGER,
  base_ghz REAL,
  boost_ghz REAL,
  tdp_watts INTEGER,
  release_year INTEGER,
  tier TEXT,
  slug TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  steam_id INTEGER,
  genre TEXT,
  release_year INTEGER,
  developer TEXT,
  publisher TEXT,
  image_url TEXT,
  min_cpu_score INTEGER,
  min_gpu_score INTEGER,
  min_ram_gb INTEGER,
  min_storage_gb INTEGER,
  min_vram_gb INTEGER,
  rec_cpu_score INTEGER,
  rec_gpu_score INTEGER,
  rec_ram_gb INTEGER,
  rec_storage_gb INTEGER,
  rec_vram_gb INTEGER,
  min_os TEXT DEFAULT 'Windows 10',
  min_directx TEXT DEFAULT 'DirectX 11',
  supports_dlss INTEGER DEFAULT 0,
  supports_fsr INTEGER DEFAULT 0,
  supports_ray_tracing INTEGER DEFAULT 0,
  ray_tracing_intensity TEXT,
  cpu_intensive INTEGER DEFAULT 0,
  gpu_intensive INTEGER DEFAULT 1,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS blog_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT,
  content TEXT,
  category TEXT,
  author TEXT DEFAULT 'RTG Team',
  image_url TEXT,
  read_time INTEGER,
  view_count INTEGER DEFAULT 0,
  featured INTEGER DEFAULT 0,
  published_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_games_name ON games(name);
CREATE INDEX IF NOT EXISTS idx_games_slug ON games(slug);
CREATE INDEX IF NOT EXISTS idx_gpus_name ON gpus(name);
CREATE INDEX IF NOT EXISTS idx_gpus_slug ON gpus(slug);
CREATE INDEX IF NOT EXISTS idx_cpus_name ON cpus(name);
CREATE INDEX IF NOT EXISTS idx_cpus_slug ON cpus(slug);
CREATE INDEX IF NOT EXISTS idx_blog_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_cat ON blog_posts(category);

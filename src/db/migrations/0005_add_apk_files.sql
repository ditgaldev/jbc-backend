-- 创建 APK 文件表
CREATE TABLE IF NOT EXISTS apk_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  version TEXT,
  description TEXT,
  r2_key TEXT NOT NULL,
  download_url TEXT NOT NULL,
  uploaded_by TEXT NOT NULL,
  uploaded_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_apk_files_uploaded_by ON apk_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_apk_files_uploaded_at ON apk_files(uploaded_at);


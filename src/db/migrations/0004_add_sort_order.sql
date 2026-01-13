-- 为 dapps 表添加 sort_order 字段
ALTER TABLE dapps ADD COLUMN sort_order INTEGER DEFAULT 0;

-- 为 listed_tokens 表添加 sort_order 字段
ALTER TABLE listed_tokens ADD COLUMN sort_order INTEGER DEFAULT 0;

-- 为 deployed_tokens 表添加 sort_order 字段
ALTER TABLE deployed_tokens ADD COLUMN sort_order INTEGER DEFAULT 0;

-- 创建索引以优化排序查询
CREATE INDEX IF NOT EXISTS idx_dapps_sort_order ON dapps(sort_order);
CREATE INDEX IF NOT EXISTS idx_listed_tokens_sort_order ON listed_tokens(sort_order);
CREATE INDEX IF NOT EXISTS idx_deployed_tokens_sort_order ON deployed_tokens(sort_order);


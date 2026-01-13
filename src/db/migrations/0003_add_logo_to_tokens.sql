-- 为 deployed_tokens 表添加 logo_r2_key 字段
ALTER TABLE deployed_tokens ADD COLUMN logo_r2_key TEXT;

-- 为 listed_tokens 表添加 logo_r2_key 字段
ALTER TABLE listed_tokens ADD COLUMN logo_r2_key TEXT;


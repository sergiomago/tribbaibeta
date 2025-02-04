ALTER TABLE ai_roles 
  ADD COLUMN embedding vector(1536),
  ADD COLUMN last_used_at TIMESTAMPTZ;

CREATE INDEX ai_roles_embedding_idx ON ai_roles USING ivfflat (embedding);

CREATE OR REPLACE FUNCTION get_similar_roles(query_embedding vector, match_threshold float, match_count int)
RETURNS SETOF ai_roles AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM ai_roles
  WHERE embedding <-> query_embedding < match_threshold
  ORDER BY embedding <-> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

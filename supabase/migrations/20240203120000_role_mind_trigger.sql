
CREATE OR REPLACE FUNCTION create_initial_role_mind()
RETURNS trigger AS $$
BEGIN
  INSERT INTO role_minds (
    role_id,
    mind_id,
    status,
    metadata,
    specialization,
    specialization_depth,
    memory_configuration
  ) VALUES (
    NEW.id,
    NULL,
    'pending',
    jsonb_build_object(
      'roleId', NEW.id,
      'created', NOW()
    ),
    'assistant',
    1,
    jsonb_build_object(
      'contextWindow', 10,
      'maxMemories', 100,
      'relevanceThreshold', 0.7
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run when new role is created
CREATE TRIGGER create_role_mind_trigger
  AFTER INSERT ON roles
  FOR EACH ROW
  EXECUTE FUNCTION create_initial_role_mind();

-- Create cleanup trigger for when role is deleted
CREATE OR REPLACE FUNCTION cleanup_role_mind()
RETURNS trigger AS $$
BEGIN
    UPDATE public.role_minds
    SET status = 'deleted'::mind_status,
        updated_at = NOW()
    WHERE role_id = OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_role_mind
  BEFORE DELETE ON roles
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_role_mind();

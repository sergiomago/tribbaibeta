
-- Add new columns for better message relationship tracking
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS responding_role_id uuid REFERENCES roles(id),
ADD COLUMN IF NOT EXISTS is_bot boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS interaction_metadata jsonb DEFAULT '{}'::jsonb;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_responding_role_id ON messages(responding_role_id);

-- Update existing messages to set is_bot based on role_id
UPDATE messages 
SET is_bot = (role_id IS NOT NULL);

-- Add thread relationship tracking
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS thread_depth integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS parent_message_id uuid REFERENCES messages(id);

-- Add function to maintain thread depth
CREATE OR REPLACE FUNCTION update_thread_depth()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_message_id IS NOT NULL THEN
    NEW.thread_depth := (
      SELECT thread_depth + 1
      FROM messages
      WHERE id = NEW.parent_message_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for thread depth
CREATE TRIGGER set_thread_depth
  BEFORE INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_thread_depth();

-- Add response order tracking
CREATE TABLE IF NOT EXISTS thread_response_order (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid REFERENCES threads(id) ON DELETE CASCADE,
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  response_position integer NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  UNIQUE(thread_id, role_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_thread_response_order_thread_id ON thread_response_order(thread_id);
CREATE INDEX IF NOT EXISTS idx_thread_response_order_role_id ON thread_response_order(role_id);

-- Add function to maintain response order
CREATE OR REPLACE FUNCTION maintain_response_order()
RETURNS TRIGGER AS $$
BEGIN
  -- Update response position when a role is added to a thread
  NEW.response_position := (
    SELECT COALESCE(MAX(response_position), 0) + 1
    FROM thread_response_order
    WHERE thread_id = NEW.thread_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for response order
CREATE TRIGGER set_response_position
  BEFORE INSERT ON thread_response_order
  FOR EACH ROW
  EXECUTE FUNCTION maintain_response_order();

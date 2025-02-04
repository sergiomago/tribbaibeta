ALTER TABLE public.messages
  ADD COLUMN current_state TEXT NOT NULL DEFAULT 'initial_analysis',
  ADD COLUMN is_ai BOOLEAN NOT NULL DEFAULT false;

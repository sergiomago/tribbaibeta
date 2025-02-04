grep -R 'Router' src/
# Should only show main.tsxgrep -R 'Router' src/
# Should only show main.tsxgrep -R 'Router' src/
# Should only show main.tsxCREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

BEGIN;

CREATE TABLE public.ai_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL CHECK (char_length(name) <= 100),
    description TEXT CHECK (char_length(description) <= 500),
    system_prompt TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (char_length(title) <= 200),
    is_team_chat BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role_id UUID REFERENCES ai_roles(id) ON DELETE SET NULL,
    content TEXT NOT NULL CHECK (char_length(content) <= 5000),
    embedding vector(1536),
    llongterm_memory_id TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_embedding ON public.messages USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id);

COMMIT;

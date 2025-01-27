import { z } from 'zod';

export const MessageSchema = z.object({
  author: z.enum(['user', 'assistant', 'system']),
  message: z.string().min(1),
  timestamp: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const MemorySectionSchema = z.object({
  content: z.string(),
  timestamp: z.number(),
  metadata: z.record(z.unknown()).optional(),
});

const MemoryStructureSchema = z.object({
  summary: z.string(),
  unstructured: z.record(z.unknown()),
  structured: z.record(z.string(), MemorySectionSchema),
});

export const CreateOptionsSchema = z.object({
  specialism: z.string().optional(),
  specialismDepth: z.number().min(1).max(10).optional(),
  initialMemory: MemoryStructureSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const validateMessage = (message: unknown) => {
  return MessageSchema.parse(message);
};

export const validateCreateOptions = (options: unknown) => {
  return CreateOptionsSchema.parse(options);
};
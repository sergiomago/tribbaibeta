import { z } from 'zod';

export const MessageSchema = z.object({
  author: z.enum(['user', 'assistant', 'system']),
  message: z.string().min(1),
  timestamp: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
}).transform(data => ({
  author: data.author,
  message: data.message,
  timestamp: data.timestamp || Date.now(),
  metadata: data.metadata || {}
}));

const MemorySectionSchema = z.object({
  content: z.string(),
  timestamp: z.number(),
  metadata: z.record(z.unknown()).optional(),
}).transform(data => ({
  content: data.content,
  timestamp: data.timestamp,
  metadata: data.metadata || {}
}));

const MemoryStructureSchema = z.object({
  summary: z.string(),
  unstructured: z.record(z.unknown()),
  structured: z.record(z.string(), MemorySectionSchema),
}).transform(data => ({
  summary: data.summary || '',
  unstructured: data.unstructured || {},
  structured: data.structured || {}
}));

export const CreateOptionsSchema = z.object({
  specialism: z.string().optional(),
  specialismDepth: z.number().min(1).max(10).optional(),
  initialMemory: MemoryStructureSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
}).transform(data => ({
  ...data,
  initialMemory: data.initialMemory || {
    summary: '',
    unstructured: {},
    structured: {}
  },
  metadata: data.metadata || {}
}));

export const validateMessage = (message: unknown) => {
  return MessageSchema.parse(message);
};

export const validateCreateOptions = (options: unknown) => {
  return CreateOptionsSchema.parse(options);
};
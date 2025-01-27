export class LlongtermError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LlongtermError';
  }
}

export class MindNotFoundError extends LlongtermError {
  constructor(mindId: string) {
    super(`Mind with ID ${mindId} not found`);
    this.name = 'MindNotFoundError';
  }
}

export class MindCreationError extends LlongtermError {
  constructor(message: string) {
    super(`Failed to create mind: ${message}`);
    this.name = 'MindCreationError';
  }
}
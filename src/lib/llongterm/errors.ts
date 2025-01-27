export class LlongtermError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LlongtermError';
  }
}

export class MindNotFoundError extends LlongtermError {
  constructor(mindId: string) {
    super(`Mind not found with ID: ${mindId}`);
    this.name = 'MindNotFoundError';
  }
}
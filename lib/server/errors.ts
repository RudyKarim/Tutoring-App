export class ApiError extends Error {
  constructor(public status: number, message: string, public field?: string) {
    super(message);
  }
}

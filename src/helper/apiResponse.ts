export class ApiResponse<T = unknown> {
  constructor(
    public statusCode: number,
    public message: string,
    public data?: T,
  ) {}

  toJSON() {
    return {
      success: true,
      message: this.message,
      data: this.data,
    };
  }
}

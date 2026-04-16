export class AppError extends Error {
  constructor(
    public statusCode: number,
    public override message: string,
    public code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const Errors = {
  UNAUTHORIZED: new AppError(401, 'No autorizado'),
  FORBIDDEN: new AppError(403, 'Acceso denegado'),
  NOT_FOUND: (resource: string) => new AppError(404, `${resource} no encontrado`),
  CONFLICT: (msg: string) => new AppError(409, msg),
  VALIDATION: (msg: string) => new AppError(422, msg),
  INTERNAL: new AppError(500, 'Error interno del servidor'),
};

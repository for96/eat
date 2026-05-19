import type { FastifyInstance, FastifyError } from "fastify";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((err: FastifyError, _req, reply) => {
    if (err instanceof ZodError) {
      return reply.status(400).send({
        error: "ValidationError",
        message: "Body o query non valida",
        details: err.flatten(),
      });
    }
    if (err instanceof HttpError) {
      return reply.status(err.statusCode).send({
        error: err.name,
        message: err.message,
        details: err.details,
      });
    }
    if (err.validation) {
      return reply.status(400).send({
        error: "ValidationError",
        message: err.message,
        details: err.validation,
      });
    }
    const status = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;
    if (status >= 500) app.log.error({ err }, "Errore server");
    return reply
      .status(status)
      .send({ error: err.name || "Error", message: err.message });
  });
}

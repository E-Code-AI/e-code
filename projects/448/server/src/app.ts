import express, { Application, Request, Response, NextFunction } from "express";
import cors, { CorsOptions } from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

dotenv.config();

export interface AppConfig {
  corsOrigin?: string | string[];
  enableLogging?: boolean;
  trustProxy?: boolean | number | string;
}

interface HttpError extends Error {
  status?: number;
  statusCode?: number;
  details?: unknown;
}

const createApp = (config: AppConfig = {}): Application => {
  const app = express();

  const {
    corsOrigin = process.env.CORS_ORIGIN || "*",
    enableLogging = process.env.NODE_ENV !== "test",
    trustProxy = process.env.TRUST_PROXY === "true" || false,
  } = config;

  if (trustProxy) {
    app.set("trust proxy", trustProxy);
  }

  app.use(helmet());

  const corsOptions: CorsOptions = {
    origin: corsOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
    ],
  };
  app.use(cors(corsOptions));

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  app.use(cookieParser());
  app.use(compression());

  if (enableLogging) {
    const format =
      process.env.NODE_ENV === "production" ? "combined" : "dev";
    app.use(morgan(format));
  }

  app.get("/health", (req: Request, res: Response) => {
    res.status(200).json({
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // Mount API routes here, for example:
  // import apiRouter from "./routes";
  // app.use("/api", apiRouter);

  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: "Not Found",
      message: `Route undefined undefined not found`,
    });
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use(
    (
      err: HttpError,
      req: Request,
      res: Response,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      next: NextFunction
    ) => {
      const status = err.statusCode || err.status || 500;
      const isProduction = process.env.NODE_ENV === "production";

      const response: Record<string, unknown> = {
        error: err.name || "Error",
        message: err.message || "Internal Server Error",
      };

      if (!isProduction) {
        response.stack = err.stack;
        if (err.details) {
          response.details = err.details;
        }
      }

      res.status(status).json(response);
    }
  );

  return app;
};

export default createApp;
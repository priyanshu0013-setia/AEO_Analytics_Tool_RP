import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import router from "./routes";

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

if (process.env.NODE_ENV === "production") {
  const staticDir = path.join(process.cwd(), "artifacts/aeo-dashboard/dist");
  if (fs.existsSync(staticDir)) {
    app.use(express.static(staticDir));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(staticDir, "index.html"));
    });
  }
}

// Global JSON error handler — must be defined after all routes
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  const httpErr = err as { status?: number; statusCode?: number };
  const status = httpErr?.status ?? httpErr?.statusCode ?? 500;
  const message =
    err instanceof Error ? err.message : "Internal server error";
  res.status(status).json({ error: message });
});

export default app;

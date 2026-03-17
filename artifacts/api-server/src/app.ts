import express, { type Express } from "express";
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
    // Serve Vite assets
    app.use(
      express.static(staticDir, {
        index: false, // don't auto-serve index.html
        // Assets can be cached; HTML should not be (we set no-store below)
        etag: true,
        maxAge: "1y",
        immutable: true,
      }),
    );

    // SPA fallback (Express 5 compatible) + prevent caching index.html
    app.get(/^(?!\/api).*$/, (_req, res) => {
      res.setHeader("Cache-Control", "no-store");
      res.sendFile(path.join(staticDir, "index.html"));
    });
  }
}
export default app;

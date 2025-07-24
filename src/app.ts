import "dotenv/config.js";
import express, { Request, Response, Application } from "express";

const app: Application = express();
const port = process.env.PORT || 8080;

app.get("/api/v1/test", async (_req: Request, res: Response) => {
  res.status(200).json({ message: "API running" });
});

app.listen(port, () => {
  console.info(`🚀 Server is running on ${port}`);
});

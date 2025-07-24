import express, { Request, Response, Application } from "express";

const app: Application = express();
const port = process.env.PORT || 8080;

app.get("/", async (req: Request, res: Response) => {
  res.send("API running");
});

app.listen(port, () => {
  console.info(`🚀 Server is running on ${port}`);
});

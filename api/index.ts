// api/index.ts
import { createServer } from "http";
// pastikan `app` diexport dari src/app.ts
import app from "../src/app.js"; // pastikan path ini sesuai dengan struktur proyek Anda
export default async function handler(req: any, res: any) {
  const server = createServer(app);
  server.emit("request", req, res);
}

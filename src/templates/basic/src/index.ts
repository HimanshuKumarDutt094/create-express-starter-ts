import { env } from "@/utils/env";
import express from "express";
const app = express();
app.get("/", (_, res) => {
  res.send("Hello, World!");
});
const PORT = env.PORT;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
export default app;

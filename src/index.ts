import env from "dotenv";
env.config({ path: ".env", quiet: true });
import app from "./app.js";

app.listen(3000, () => console.log("Server running on port 3000"));

import express from "express";
import { json, urlencoded } from "body-parser";
import { closeDb } from "./db/dbConfig";
import siteRouter from "./routes/siteRoutes";
import mangaRouter from "./routes/mangaRoutes";

const PORT = process.env.PORT || 8000;
export const app = express();

app.use(json());
app.use(urlencoded({ extended: true }));

app.use("/sites", siteRouter);
app.use("/mangas", mangaRouter);

const shutdown = () => {
    try {
        server.close();
        closeDb();
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
process.on("uncaughtException", shutdown);

const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

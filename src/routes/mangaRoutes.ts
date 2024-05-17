import { Router } from "express";
import {
    getMangasController,
    getMangaFromNameController,
    getMangaFromSiteController,
    addMangaController,
    addSiteToMangaController,
    updateMangaController,
    deleteMangaController,
    deleteSiteFromMangaController,
} from "../controllers/mangasControllers";

const mangaRouter = Router();

mangaRouter.get("/", getMangasController);
mangaRouter.get("/:name", getMangaFromNameController);
mangaRouter.get("/site/:site", getMangaFromSiteController);
mangaRouter.post("/", addMangaController);
mangaRouter.post("/site", addSiteToMangaController);
mangaRouter.put("/", updateMangaController);
mangaRouter.delete("/:name", deleteMangaController);
mangaRouter.delete("/site", deleteSiteFromMangaController);

export default mangaRouter;

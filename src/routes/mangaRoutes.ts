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
    updateMangaChapterController,
} from "../controllers/mangasControllers";

const mangaRouter = Router();

mangaRouter.get("/", getMangasController);
mangaRouter.get("/:name", getMangaFromNameController);
mangaRouter.get("/site/:name", getMangaFromSiteController);
mangaRouter.post("/", addMangaController);
mangaRouter.post("/site", addSiteToMangaController);
mangaRouter.put("/", updateMangaController);
mangaRouter.put("/chapter", updateMangaChapterController);
mangaRouter.delete("/site", deleteSiteFromMangaController);
mangaRouter.delete("/", deleteMangaController);

export default mangaRouter;

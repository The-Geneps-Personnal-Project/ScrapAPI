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
import { asyncHandler } from "../middleware/errorHandler";
import { validate } from "../middleware/validate";
import {
    createMangaSchema,
    mangaSiteQuerySchema,
    nameParamSchema,
    nameQuerySchema,
    siteToMangaSchema,
    updateChapterSchema,
    updateMangaSchema,
} from "../schemas";

const mangaRouter = Router();

mangaRouter.get("/", asyncHandler(getMangasController));

// Literal-prefixed route declared before the bare parameter, by convention.
mangaRouter.get("/site/:name", validate({ params: nameParamSchema }), asyncHandler(getMangaFromSiteController));

mangaRouter.get("/:name", validate({ params: nameParamSchema }), asyncHandler(getMangaFromNameController));

mangaRouter.post("/", validate({ body: createMangaSchema }), asyncHandler(addMangaController));
mangaRouter.post("/site", validate({ body: siteToMangaSchema }), asyncHandler(addSiteToMangaController));

mangaRouter.put("/", validate({ body: updateMangaSchema }), asyncHandler(updateMangaController));
mangaRouter.put("/chapter", validate({ body: updateChapterSchema }), asyncHandler(updateMangaChapterController));

mangaRouter.delete("/site", validate({ query: mangaSiteQuerySchema }), asyncHandler(deleteSiteFromMangaController));
mangaRouter.delete("/", validate({ query: nameQuerySchema }), asyncHandler(deleteMangaController));

export default mangaRouter;

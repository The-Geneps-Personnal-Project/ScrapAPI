import { Router } from "express";

import {
    getSitesController,
    getSiteFromNameController,
    addSiteController,
    updateSiteController,
    deleteSiteController,
} from "../controllers/siteControllers";
import { asyncHandler } from "../middleware/errorHandler";
import { validate } from "../middleware/validate";
import { nameParamSchema, nameQuerySchema, siteSchema } from "../schemas";

const siteRouter = Router();

siteRouter.get("/", asyncHandler(getSitesController));
siteRouter.get("/:name", validate({ params: nameParamSchema }), asyncHandler(getSiteFromNameController));
siteRouter.post("/", validate({ body: siteSchema }), asyncHandler(addSiteController));
siteRouter.put("/", validate({ body: siteSchema }), asyncHandler(updateSiteController));
siteRouter.delete("/", validate({ query: nameQuerySchema }), asyncHandler(deleteSiteController));

export default siteRouter;

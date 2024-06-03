import { Router } from "express";
import {
    getSitesController,
    getSiteFromNameController,
    addSiteController,
    updateSiteController,
    deleteSiteController,
} from "../controllers/siteControllers";

const siteRouter = Router();

siteRouter.get("/", getSitesController);
siteRouter.get("/:name", getSiteFromNameController);
siteRouter.post("/", addSiteController);
siteRouter.put("/", updateSiteController);
siteRouter.delete("/", deleteSiteController);

export default siteRouter;

import { Request, Response } from "express";

import { SiteInfo, addSite, deleteSite, getSiteFromName, getSites, updateSite } from "../models/siteModel";
import { ConflictError, NotFoundError } from "../errors";
import { body, params, query } from "../middleware/validate";
import { SitePayload } from "../schemas";

export const getSitesController = async (_req: Request, res: Response) => {
    res.status(200).json(await getSites());
};

export const getSiteFromNameController = async (_req: Request, res: Response) => {
    const { name } = params<{ name: string }>(res);
    const site = await getSiteFromName(name);

    if (!site) throw new NotFoundError("Site", name);

    res.status(200).json(site);
};

export const addSiteController = async (_req: Request, res: Response) => {
    const payload = body<SitePayload>(res);

    // Site names key every lookup (getSiteFromName, updateSite, deleteSite), so a
    // duplicate would quietly corrupt all three. Nothing prevented one before.
    if (await getSiteFromName(payload.site)) {
        throw new ConflictError(`Site '${payload.site}' already exists`);
    }

    const id = await addSite(payload as SiteInfo);
    res.status(201).json({ id, site: payload.site });
};

export const updateSiteController = async (_req: Request, res: Response) => {
    const payload = body<SitePayload>(res);

    const updated = await updateSite(payload as SiteInfo);
    if (!updated) throw new NotFoundError("Site", payload.site);

    res.status(200).json({ site: payload.site });
};

export const deleteSiteController = async (_req: Request, res: Response) => {
    const { name } = query<{ name: string }>(res);

    const deleted = await deleteSite(name);
    if (!deleted) throw new NotFoundError("Site", name);

    res.status(200).json({ name });
};

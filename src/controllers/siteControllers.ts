import { Request, Response } from "express";
import { SiteInfo, deleteSite, updateSite } from "../models/siteModel";
import { addSite, getSiteFromName, getSites } from "../models/siteModel";

export const getSitesController = async (req: Request, res: Response): Promise<Response<any, Record<string, any>>> => {
    try {
        const sites: SiteInfo[] = await getSites();
        if (sites.length === 0) return res.status(404).send("No sites found");

        return res.status(200).send(sites);
    } catch (error) {
        return res.status(500).send((error as Error).message);
    }
};

export const getSiteFromNameController = async (
    req: Request,
    res: Response
): Promise<Response<any, Record<string, any>>> => {
    const name: string = req.params.name;

    try {
        const site = await getSiteFromName(name);

        return res.status(200).send(site);
    } catch (error) {
        return res.status(500).send((error as Error).message);
    }
};

export const addSiteController = async (req: Request, res: Response): Promise<Response<any, Record<string, any>>> => {
    const site: SiteInfo = req.body;

    try {
        await addSite(site);
        return res.status(201).send("Site added");
    } catch (error) {
        return res.status(500).send((error as Error).message);
    }
};

export const updateSiteController = async (
    req: Request,
    res: Response
): Promise<Response<any, Record<string, any>>> => {
    const site: SiteInfo = req.body;

    try {
        await updateSite(site);
        return res.status(200).send("Site updated");
    } catch (error) {
        return res.status(500).send((error as Error).message);
    }
};

export const deleteSiteController = async (
    req: Request,
    res: Response
): Promise<Response<any, Record<string, any>>> => {
    const name: string = req.query.name as string;

    try {
        await deleteSite(name);
        return res.status(200).send("Site deleted");
    } catch (error) {
        return res.status(500).send((error as Error).message);
    }
};

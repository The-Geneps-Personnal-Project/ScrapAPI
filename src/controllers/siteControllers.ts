import { Request, Response } from "express";
import { SiteInfo, deleteSite, updateSite } from "../models/siteModel";
import { addSite, getSiteFromName, getSites } from "../models/siteModel";

export const getSitesController = async (req: Request, res: Response): Promise<void> => {
    try {
        const sites: SiteInfo[] = await getSites();
        if (sites.length === 0) res.status(404).send("No sites found");

        res.status(200).send(sites);
    } catch (error) {
        res.status(500).send(error);
    }
};

export const getSiteFromNameController = async (req: Request, res: Response): Promise<void> => {
    const name: string = req.params.name;

    try {
        const site = await getSiteFromName(name);
        if (!site) res.status(404).send("Site not found");

        res.status(200).send(site);
    } catch (error) {
        res.status(500).send(error);
    }
};

export const addSiteController = async (req: Request, res: Response): Promise<void> => {
    const site: SiteInfo = req.body;

    try {
        await addSite(site);
        res.status(201).send("Site added");
    } catch (error) {
        res.status(500).send(error);
    }
};

export const updateSiteController = async (req: Request, res: Response): Promise<void> => {
    const site: SiteInfo = req.body;

    try {
        await updateSite(site);
        res.status(200).send("Site updated");
    } catch (error) {
        res.status(500).send(error);
    }
};

export const deleteSiteController = async (req: Request, res: Response): Promise<void> => {
    const name: string = req.params.name;

    try {
        await deleteSite(name);
        res.status(200).send("Site deleted");
    } catch (error) {
        res.status(500).send(error);
    }
};

import { Request, Response } from "express";
import { MangaInfo } from "../models/mangaModel";
import {
    getMangaList,
    getMangaFromName,
    getMangaFromSite,
    addManga,
    addSiteToManga,
    updateManga,
    deleteManga,
    deleteSiteFromManga,
} from "../models/mangaModel";
import { getSiteFromName } from "../models/siteModel";

export const getMangasController = async (req: Request, res: Response): Promise<void> => {
    try {
        const mangas: MangaInfo[] = await getMangaList();
        if (mangas.length === 0) res.status(404).send("No mangas found");

        res.status(200).send(mangas);
    } catch (error) {
        res.status(500).send(error);
    }
};

export const getMangaFromNameController = async (req: Request, res: Response): Promise<void> => {
    const name: string = req.params.name;

    try {
        const manga: MangaInfo | null = await getMangaFromName(name);
        if (!manga) res.status(404).send("Manga not found");

        res.status(200).send(manga);
    } catch (error) {
        res.status(500).send(error);
    }
};

export const getMangaFromSiteController = async (req: Request, res: Response): Promise<void> => {
    const site: string = req.params.site;

    try {
        const manga: MangaInfo | null = await getMangaFromSite(site);
        if (!manga) res.status(404).send("Manga not found");

        res.status(200).send(manga);
    } catch (error) {
        res.status(500).send(error);
    }
};

export const addMangaController = async (req: Request, res: Response): Promise<void> => {
    const manga: MangaInfo = req.body;

    try {
        await addManga(manga);
        res.status(201).send("Manga added");
    } catch (error) {
        res.status(500).send(error);
    }
};

export const addSiteToMangaController = async (req: Request, res: Response): Promise<void> => {
    const { manga, site } = req.body;

    try {
        const s = await getSiteFromName(site);
        await addSiteToManga(manga, s);
        res.status(201).send("Site added to manga");
    } catch (error) {
        res.status(500).send(error);
    }
};

export const updateMangaController = async (req: Request, res: Response): Promise<void> => {
    const manga: MangaInfo = req.body;

    try {
        await updateManga(manga);
        res.status(200).send("Manga updated");
    } catch (error) {
        res.status(500).send(error);
    }
};

export const deleteMangaController = async (req: Request, res: Response): Promise<void> => {
    const name: string = req.params.name;

    try {
        await deleteManga(name);
        res.status(200).send("Manga deleted");
    } catch (error) {
        res.status(500).send(error);
    }
};

export const deleteSiteFromMangaController = async (req: Request, res: Response): Promise<void> => {
    const { manga, site } = req.body;

    try {
        const s = await getSiteFromName(site);
        await deleteSiteFromManga(manga, s);
        res.status(200).send("Site deleted from manga");
    } catch (error) {
        res.status(500).send(error);
    }
};

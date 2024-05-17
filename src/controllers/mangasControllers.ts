import { Request, Response } from "express";
import { MangaInfo } from "../models/MangaModel";
import {
    getMangaListService,
    getMangaFromNameService,
    getMangaFromSiteService,
    addMangaService,
    addSiteToMangaService,
    updateMangaService,
    deleteMangaService,
    deleteSiteFromMangaService,
} from "../services/mangaServices";
import { getSiteFromNameService } from "../services/siteServices";

export const getMangasController = async (req: Request, res: Response): Promise<void> => {
    try {
        const mangas: MangaInfo[] = await getMangaListService();
        if (mangas.length === 0) res.status(404).send("No mangas found");

        res.status(200).send(mangas);
    } catch (error) {
        res.status(500).send(error);
    }
};

export const getMangaFromNameController = async (req: Request, res: Response): Promise<void> => {
    const name: string = req.params.name;

    try {
        const manga: MangaInfo | null = await getMangaFromNameService(name);
        if (!manga) res.status(404).send("Manga not found");

        res.status(200).send(manga);
    } catch (error) {
        res.status(500).send(error);
    }
};

export const getMangaFromSiteController = async (req: Request, res: Response): Promise<void> => {
    const site: string = req.params.site;

    try {
        const manga: MangaInfo | null = await getMangaFromSiteService(site);
        if (!manga) res.status(404).send("Manga not found");

        res.status(200).send(manga);
    } catch (error) {
        res.status(500).send(error);
    }
};

export const addMangaController = async (req: Request, res: Response): Promise<void> => {
    const manga: MangaInfo = req.body;

    try {
        await addMangaService(manga);
        res.status(201).send("Manga added");
    } catch (error) {
        res.status(500).send(error);
    }
};

export const addSiteToMangaController = async (req: Request, res: Response): Promise<void> => {
    const { manga, site } = req.body;

    try {
        const s = await getSiteFromNameService(site);
        await addSiteToMangaService(manga, s);
        res.status(201).send("Site added to manga");
    } catch (error) {
        res.status(500).send(error);
    }
};

export const updateMangaController = async (req: Request, res: Response): Promise<void> => {
    const manga: MangaInfo = req.body;

    try {
        await updateMangaService(manga);
        res.status(200).send("Manga updated");
    } catch (error) {
        res.status(500).send(error);
    }
};

export const deleteMangaController = async (req: Request, res: Response): Promise<void> => {
    const name: string = req.params.name;

    try {
        await deleteMangaService(name);
        res.status(200).send("Manga deleted");
    } catch (error) {
        res.status(500).send(error);
    }
};

export const deleteSiteFromMangaController = async (req: Request, res: Response): Promise<void> => {
    const { manga, site } = req.body;

    try {
        const s = await getSiteFromNameService(site);
        await deleteSiteFromMangaService(manga, s);
        res.status(200).send("Site deleted from manga");
    } catch (error) {
        res.status(500).send(error);
    }
};

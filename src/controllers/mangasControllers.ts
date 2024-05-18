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

export const getMangasController = async (req: Request, res: Response): Promise<Response<any, Record<string, any>>> => {
    try {
        const mangas: MangaInfo[] = await getMangaList();
        if (mangas.length === 0) return res.status(404).send("No mangas found");

        return res.status(200).send(mangas);
    } catch (error) {
        return res.status(500).send((error as Error).message);
    }
};

export const getMangaFromNameController = async (
    req: Request,
    res: Response
): Promise<Response<any, Record<string, any>>> => {
    const name: string = req.params.name;

    try {
        const manga: MangaInfo | null = await getMangaFromName(name);
        if (!manga) return res.status(404).send("Manga not found");

        return res.status(200).send(manga);
    } catch (error) {
        return res.status(500).send((error as Error).message);
    }
};

export const getMangaFromSiteController = async (
    req: Request,
    res: Response
): Promise<Response<any, Record<string, any>>> => {
    const site: string = req.params.site;

    try {
        const manga: MangaInfo | null = await getMangaFromSite(site);
        if (!manga) return res.status(404).send("Manga not found");

        return res.status(200).send(manga);
    } catch (error) {
        return res.status(500).send((error as Error).message);
    }
};

export const addMangaController = async (req: Request, res: Response): Promise<Response<any, Record<string, any>>> => {
    const manga: MangaInfo = req.body;

    try {
        await addManga(manga);
        return res.status(201).send("Manga added");
    } catch (error) {
        return res.status(500).send((error as Error).message);
    }
};

export const addSiteToMangaController = async (
    req: Request,
    res: Response
): Promise<Response<any, Record<string, any>>> => {
    const { manga, site } = req.body;

    try {
        const s = await getSiteFromName(site);
        await addSiteToManga(manga, s);
        return res.status(201).send("Site added to manga");
    } catch (error) {
        return res.status(500).send((error as Error).message);
    }
};

export const updateMangaController = async (
    req: Request,
    res: Response
): Promise<Response<any, Record<string, any>>> => {
    const manga: MangaInfo = req.body;

    try {
        await updateManga(manga);
        return res.status(200).send("Manga updated");
    } catch (error) {
        return res.status(500).send((error as Error).message);
    }
};

export const deleteMangaController = async (
    req: Request,
    res: Response
): Promise<Response<any, Record<string, any>>> => {
    const name: string = req.params.name;

    try {
        await deleteManga(name);
        return res.status(200).send("Manga deleted");
    } catch (error) {
        return res.status(500).send((error as Error).message);
    }
};

export const deleteSiteFromMangaController = async (
    req: Request,
    res: Response
): Promise<Response<any, Record<string, any>>> => {
    const { manga, site } = req.body;

    try {
        const s = await getSiteFromName(site);
        await deleteSiteFromManga(manga, s);
        return res.status(200).send("Site deleted from manga");
    } catch (error) {
        return res.status(500).send((error as Error).message);
    }
};

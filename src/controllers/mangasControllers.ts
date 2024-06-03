import { Request, Response } from "express";
import { MangaInfo } from "../models/mangaModel";
import {
    getMangaList,
    getMangaFromName,
    getMangaFromSite,
    addManga,
    addSiteToManga,
    updateManga,
    updateMangaChapter,
    deleteManga,
    deleteSiteFromManga,
} from "../models/mangaModel";
import { getSiteFromName } from "../models/siteModel";

export const getMangasController = async (req: Request, res: Response): Promise<Response<any, Record<string, any>>> => {
    try {
        const mangas: MangaInfo[] = await getMangaList();

        return res.status(200).send(mangas);
    } catch (error) {
        return res.status(500).send((error as Error).message);
    }
};

export const getMangaFromNameController = async (
    req: Request,
    res: Response
): Promise<Response<any, Record<string, any>>> => {
    const name: string = req.params.name as string;

    try {
        const manga: MangaInfo | null = await getMangaFromName(name);

        return res.status(200).send(manga);
    } catch (error) {
        return res.status(500).send((error as Error).message);
    }
};

export const getMangaFromSiteController = async (
    req: Request,
    res: Response
): Promise<Response<any, Record<string, any>>> => {
    const name: string = req.query.name as string;

    try {
        const manga: MangaInfo | null = await getMangaFromSite(name);

        return res.status(200).send(manga);
    } catch (error) {
        return res.status(500).send((error as Error).message);
    }
};

export const addMangaController = async (req: Request, res: Response): Promise<Response<any, Record<string, any>>> => {
    let manga: MangaInfo = req.body;

    try {
        if (!Array.isArray(manga.sites)) manga.sites = [manga.sites];

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

export const updateMangaChapterController = async (req: Request, res: Response) => {
    const { name, chapter } = req.body;

    try {
        await updateMangaChapter(name, chapter as string);
        return res.status(200).send("Manga chapter updated");
    } catch (error) {
        return res.status(500).send((error as Error).message);
    }
};

export const deleteMangaController = async (
    req: Request,
    res: Response
): Promise<Response<any, Record<string, any>>> => {
    const name: string = req.query.name as string;

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
    const { manga, site } = req.query;

    try {
        const s = await getSiteFromName(site as string);
        await deleteSiteFromManga(manga as string, s);
        return res.status(200).send("Site deleted from manga");
    } catch (error) {
        return res.status(500).send((error as Error).message);
    }
};

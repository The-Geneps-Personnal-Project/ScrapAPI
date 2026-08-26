import { Request, Response } from "express";

import {
    MangaInfo,
    getMangaList,
    getMangaFromName,
    getMangasFromSite,
    addManga,
    addSiteToManga,
    updateManga,
    updateMangaChapter,
    deleteManga,
    deleteSiteFromManga,
} from "../models/mangaModel";
import { getSiteFromName } from "../models/siteModel";
import { ConflictError, NotFoundError } from "../errors";
import { body, params, query } from "../middleware/validate";
import {
    CreateMangaPayload,
    UpdateMangaPayload,
} from "../schemas";

/**
 * Controllers no longer wrap themselves in try/catch. Throwing is the contract:
 * `asyncHandler` forwards the rejection to the central error handler, which maps
 * typed errors to status codes and keeps internal messages out of responses.
 * Previously every failure — including "not found" — came back as a 500 carrying the
 * raw SQL error text.
 */

export const getMangasController = async (_req: Request, res: Response) => {
    res.status(200).json(await getMangaList());
};

export const getMangaFromNameController = async (_req: Request, res: Response) => {
    const { name } = params<{ name: string }>(res);
    const manga = await getMangaFromName(name);

    if (!manga) throw new NotFoundError("Manga", name);

    res.status(200).json(manga);
};

export const getMangaFromSiteController = async (_req: Request, res: Response) => {
    // Reads the path parameter the route actually declares. It used to read
    // `req.query.name` on a `/site/:name` route, so the endpoint always came back empty.
    const { name } = params<{ name: string }>(res);

    res.status(200).json(await getMangasFromSite(name));
};

export const addMangaController = async (_req: Request, res: Response) => {
    const payload = body<CreateMangaPayload>(res);

    if (await getMangaFromName(payload.name)) {
        throw new ConflictError(`Manga '${payload.name}' already exists`);
    }

    const id = await addManga(payload as unknown as MangaInfo);
    res.status(201).json({ id, name: payload.name });
};

export const addSiteToMangaController = async (_req: Request, res: Response) => {
    const { manga, site } = body<{ manga: string; site: string }>(res);

    const siteRecord = await getSiteFromName(site);
    if (!siteRecord) throw new NotFoundError("Site", site);

    const linked = await addSiteToManga(manga, siteRecord);
    if (!linked) throw new NotFoundError("Manga", manga);

    res.status(201).json({ manga, site });
};

export const updateMangaController = async (_req: Request, res: Response) => {
    const payload = body<UpdateMangaPayload>(res);

    const updated = await updateManga(payload as unknown as MangaInfo);
    if (!updated) throw new NotFoundError("Manga", payload.id);

    res.status(200).json({ id: payload.id });
};

export const updateMangaChapterController = async (_req: Request, res: Response) => {
    const { name, chapter, last_updated } = body<{ name: string; chapter: string; last_updated?: string }>(res);

    const updated = await updateMangaChapter(name, chapter, last_updated);
    if (!updated) throw new NotFoundError("Manga", name);

    res.status(200).json({ name, chapter });
};

export const deleteMangaController = async (_req: Request, res: Response) => {
    const { name } = query<{ name: string }>(res);

    const deleted = await deleteManga(name);
    if (!deleted) throw new NotFoundError("Manga", name);

    res.status(200).json({ name });
};

export const deleteSiteFromMangaController = async (_req: Request, res: Response) => {
    const { manga, site } = query<{ manga: string; site: string }>(res);

    const siteRecord = await getSiteFromName(site);
    if (!siteRecord) throw new NotFoundError("Site", site);

    const removed = await deleteSiteFromManga(manga, siteRecord);
    if (!removed) throw new NotFoundError("Manga", manga);

    res.status(200).json({ manga, site });
};

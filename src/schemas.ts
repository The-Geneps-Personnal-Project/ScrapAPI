import { z } from "zod";

/**
 * Runtime validation for every request body and query.
 *
 * The controllers used to cast `req.body` straight to `MangaInfo`/`SiteInfo`. Those
 * types are erased at runtime, so a missing `sites` array or a malformed tag reached
 * the SQL layer and surfaced as a 500 TypeError.
 */

const nonEmpty = (label: string) => z.string().trim().min(1, `${label} is required`);

export const siteSchema = z.object({
    id: z.number().int().positive().optional(),
    site: nonEmpty("site"),
    url: nonEmpty("url").url("url must be a valid URL"),
    chapter_url: nonEmpty("chapter_url"),
    // Can legitimately be empty: some sites expose no separator around "chapter".
    chapter_limiter: z.string().default(""),
});

export const mangaInfosSchema = z.object({
    tags: z.array(z.object({ name: nonEmpty("tag name") })).default([]),
    description: z.string().default(""),
    // AniList returns `{ medium }`; older bot builds sent a bare string. Accept both
    // and normalise to the string the column actually stores.
    coverImage: z
        .union([z.string(), z.object({ medium: z.string() }).transform(value => value.medium)])
        .default(""),
    largeImage: z.string().optional(),
});

export const createMangaSchema = z.object({
    anilist_id: z.coerce.number().int().nonnegative(),
    name: nonEmpty("name"),
    chapter: z.coerce.string(),
    // `alert` is nullish-defaulted, not truthy-defaulted: `alert: 0` used to be
    // silently flipped to 1 because 0 is falsy.
    alert: z.coerce.number().int().min(0).max(1).nullish().transform(value => value ?? 1),
    sites: z.array(siteSchema.partial({ url: true, chapter_url: true, chapter_limiter: true })).default([]),
    infos: mangaInfosSchema.optional(),
});

export const updateMangaSchema = createMangaSchema.extend({
    id: z.coerce.number().int().positive({ message: "id is required to update a manga" }),
});

export const updateChapterSchema = z.object({
    name: nonEmpty("name"),
    chapter: z.coerce.string(),
    last_updated: z.string().optional(),
});

export const siteToMangaSchema = z.object({
    manga: nonEmpty("manga"),
    site: nonEmpty("site"),
});

export const nameQuerySchema = z.object({ name: nonEmpty("name") });

export const mangaSiteQuerySchema = z.object({
    manga: nonEmpty("manga"),
    site: nonEmpty("site"),
});

export const nameParamSchema = z.object({ name: nonEmpty("name") });

export type SitePayload = z.infer<typeof siteSchema>;
export type CreateMangaPayload = z.infer<typeof createMangaSchema>;
export type UpdateMangaPayload = z.infer<typeof updateMangaSchema>;

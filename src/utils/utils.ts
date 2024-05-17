export function replaceURL(url: string): string {
    const withoutSpaces = url.replace(/ /g, "-");
    return withoutSpaces.replace(/[^a-zA-Z0-9-]/g, "").toLowerCase();
}

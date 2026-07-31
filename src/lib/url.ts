export function url(path: string) {
    const base = import.meta.env.BASE_URL.replace(/\/?$/, "/");
    return base + path.replace(/^\//, "");
}

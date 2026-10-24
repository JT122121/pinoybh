export const ADSENSE_SRC = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9013281257238178";

/** Admin pages show member emails, so ads never run there. */
export const isAdFreePath = (path: string) => path.startsWith("/admin");

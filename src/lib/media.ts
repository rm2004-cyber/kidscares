/**
 * One shape for every uploaded asset.
 *
 * `publicId` is Cloudinary's handle for the file — without it a deleted
 * product would leave its images orphaned in the account forever, so it
 * travels with the URL everywhere rather than being dropped at the form.
 */
export type MediaItem = {
  url: string;
  publicId?: string;
  width?: number;
  height?: number;
  alt?: string;
};

/** Accepts a string, an object, or a mixed array and normalises to MediaItem[]. */
export function toMedia(input: unknown): MediaItem[] {
  if (!input) return [];
  const list = Array.isArray(input) ? input : [input];

  return list
    .map((i): MediaItem | null => {
      if (!i) return null;
      if (typeof i === "string") return { url: i };
      const o = i as MediaItem;
      return o.url ? o : null;
    })
    .filter((i): i is MediaItem => i !== null);
}

/** Single-image fields store one object; this reads either shape safely. */
export function firstUrl(input: unknown): string {
  return toMedia(input)[0]?.url ?? "";
}

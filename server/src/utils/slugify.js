export const slugify = (input = "") =>
  String(input)
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9/]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");

/**
 * Appends -2, -3 … until the slug is free. Takes the model so it works for
 * products, categories and brands alike.
 */
export async function uniqueSlug(Model, base, ignoreId = null) {
  const root = slugify(base);
  let candidate = root;
  let n = 1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const query = { slug: candidate };
    if (ignoreId) query._id = { $ne: ignoreId };
    const clash = await Model.exists(query);
    if (!clash) return candidate;
    n += 1;
    candidate = `${root}-${n}`;
  }
}

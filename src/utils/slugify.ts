export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')     // Replace spaces with _
    .replace(/[^\w_]+/g, '')  // Remove all non-word chars (except _)
    .replace(/__+/g, '_');    // Replace multiple _ with single _
}

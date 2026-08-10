/**
 * Keeping an order the database does not know about.
 *
 * Semantic search decides the ORDER of a result set, and it decides it somewhere
 * else — in Python, from a cosine distance the catalog query has never seen. What
 * comes back from it is a list of slugs whose sequence IS the answer.
 *
 * `slug = ANY($1)` is a membership test. It carries no order whatsoever; the rows
 * arrive in whatever sequence the planner found cheapest, which for a small table
 * is usually physical order and therefore looks stable right up until it isn't.
 * Re-imposing the ranking in SQL is possible (`ORDER BY array_position(...)`) but
 * it hides the single most important rule of this feature inside a string.
 *
 * So it happens here instead: one function, no database, no `server-only` —
 * which also means the rule can be tested without one.
 */
export function orderBySlugs<T extends { slug: string }>(
  rows: readonly T[],
  slugs: readonly string[],
): T[] {
  const bySlug = new Map<string, T>();
  for (const row of rows) {
    if (!bySlug.has(row.slug)) bySlug.set(row.slug, row);
  }

  const ordered: T[] = [];
  const taken = new Set<string>();

  for (const slug of slugs) {
    // A slug can go missing between the search and the read: a filter the
    // ranking never applied, a house taken off the map, a hand-edited URL.
    // Missing means missing — it is skipped, never rendered as a hole.
    if (taken.has(slug)) continue;
    const row = bySlug.get(slug);
    if (!row) continue;
    taken.add(slug);
    ordered.push(row);
  }

  return ordered;
}

/** Clamps user-supplied paging so a caller cannot ask for 10,000 rows. */
export function readPaging(query, { defaultLimit = 24, maxLimit = 100 } = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(
    maxLimit,
    Math.max(1, Number.parseInt(query.limit, 10) || defaultLimit),
  );
  return { page, limit, skip: (page - 1) * limit };
}

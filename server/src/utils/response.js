/** Every successful response has the same envelope, so the client can trust it. */
export const ok = (res, data, meta) =>
  res.json({ success: true, data, ...(meta ? { meta } : {}) });

export const created = (res, data) =>
  res.status(201).json({ success: true, data });

export const noContent = (res) => res.status(204).end();

/** Standard pagination block used by every list endpoint. */
export const paginated = (res, items, { page, limit, total }) =>
  res.json({
    success: true,
    data: items,
    meta: {
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
      hasMore: page * limit < total,
    },
  });

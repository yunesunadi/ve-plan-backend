export interface Paging {
  offset: number;
  limit: number;
}

export interface PageMeta extends Paging {
  total: number;
}

export function parsePaging(
  query: any,
  { defaultLimit = 10, maxLimit = 50 }: { defaultLimit?: number; maxLimit?: number } = {}
): Paging {
  const rawOffset = Math.floor(Number(query?.offset));
  const rawLimit = Math.floor(Number(query?.limit));

  const offset = Number.isFinite(rawOffset) ? Math.max(0, rawOffset) : 0;
  const limit = Number.isFinite(rawLimit)
    ? Math.min(maxLimit, Math.max(1, rawLimit))
    : defaultLimit;

  return { offset, limit };
}

export function pageMeta(total: number, offset: number, limit: number): PageMeta {
  return { total, offset, limit };
}

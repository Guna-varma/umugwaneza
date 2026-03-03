import { useMemo, useState } from "react";

const PAGE_SIZES = [10, 25, 50, 100] as const;

export function useListTable<T>(
  items: T[],
  searchFields: (keyof T)[],
  getSearchableString: (item: T) => string,
  defaultPageSize: number = 10
) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.trim().toLowerCase();
    return items.filter((item) => getSearchableString(item).toLowerCase().includes(q));
  }, [items, search, getSearchableString]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const from = (currentPage - 1) * pageSize;
  const to = Math.min(from + pageSize, filtered.length);
  const pageItems = useMemo(
    () => filtered.slice(from, to),
    [filtered, from, to]
  );

  const goToPage = (p: number) => setPage(Math.max(1, Math.min(p, totalPages)));
  const resetPage = () => setPage(1);

  return {
    search,
    setSearch,
    page: currentPage,
    setPage: goToPage,
    pageSize,
    setPageSize: (n: number) => {
      setPageSize(n);
      setPage(1);
    },
    pageSizes: PAGE_SIZES,
    totalItems: filtered.length,
    totalPages,
    from: filtered.length === 0 ? 0 : from + 1,
    to,
    pageItems,
    resetPage,
  };
}

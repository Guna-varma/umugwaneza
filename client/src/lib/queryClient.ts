import { QueryClient } from "@tanstack/react-query";

/** No default queryFn - every useQuery must use Supabase (db().from(...) or .rpc(...)) with an explicit queryFn. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 60 * 1000,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

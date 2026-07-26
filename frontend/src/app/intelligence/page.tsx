"use client";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import { api, IntelligenceBusiness, IntelligenceSearchResponse, Page, SearchHistory } from "@/lib/api";

export default function IntelligencePage() {
  const qc = useQueryClient();
  const [category, setCategory] = useState("DENTIST");
  const [location, setLocation] = useState("HSR Layout, Bengaluru");
  const [phoneRequired, setPhoneRequired] = useState(false);
  const [websiteFilter, setWebsiteFilter] = useState("ANY");
  const [q, setQ] = useState("");

  const businesses = useInfiniteQuery({
    queryKey: ["intelligence-businesses", q],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      api
        .get<Page<IntelligenceBusiness>>("/api/v1/intelligence/businesses", {
          params: { q, page: pageParam, size: 20 },
        })
        .then((r) => r.data),
    getNextPageParam: (last) => (last.page + 1 < last.totalPages ? last.page + 1 : undefined),
  });
  const history = useQuery({
    queryKey: ["intelligence-history"],
    queryFn: () => api.get<SearchHistory[]>("/api/v1/intelligence/search-history").then((r) => r.data),
  });
  const search = useMutation({
    mutationFn: () =>
      api
        .post<IntelligenceSearchResponse>("/api/v1/intelligence/businesses/search", {
          category,
          location,
          radiusMeters: 10000,
          maximumResults: 50,
          phoneRequired,
          websiteFilter,
        })
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["intelligence-businesses"] });
      qc.invalidateQueries({ queryKey: ["intelligence-history"] });
    },
  });
  const rows = useMemo(() => businesses.data?.pages.flatMap((page) => page.content) ?? [], [businesses.data]);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4">Business Intelligence</Typography>
        <Typography color="text.secondary">
          Discover canonical businesses now; enrichment runs in the background.
        </Typography>
      </Box>
      <Card>
        <CardContent>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField fullWidth label="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth label="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <TextField select fullWidth label="Phone" value={String(phoneRequired)} onChange={(e) => setPhoneRequired(e.target.value === "true")}>
                <MenuItem value="false">Optional</MenuItem>
                <MenuItem value="true">Required</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <TextField select fullWidth label="Website" value={websiteFilter} onChange={(e) => setWebsiteFilter(e.target.value)}>
                {["ANY", "HAS_WEBSITE", "NO_WEBSITE"].map((x) => (
                  <MenuItem key={x} value={x}>{x}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 1 }}>
              <Button fullWidth sx={{ height: "100%" }} variant="contained" onClick={() => search.mutate()} disabled={search.isPending}>
                Search
              </Button>
            </Grid>
          </Grid>
          {search.isPending && <LinearProgress sx={{ mt: 2 }} />}
          {search.data && (
            <Alert severity="success" sx={{ mt: 2 }}>
              Search queued enrichment for {search.data.queuedJobs} businesses. Persisted {search.data.persistedCount}.
            </Alert>
          )}
          {search.isError && <Alert severity="error" sx={{ mt: 2 }}>Search failed.</Alert>}
        </CardContent>
      </Card>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Stack spacing={2}>
            <TextField label="Filter canonical businesses" value={q} onChange={(e) => setQ(e.target.value)} />
            {businesses.isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={110} />)
            ) : rows.length ? (
              rows.map((business) => <BusinessCard key={business.id} business={business} />)
            ) : (
              <Alert severity="info">No canonical businesses yet. Run a discovery search.</Alert>
            )}
            {businesses.hasNextPage && (
              <Button onClick={() => businesses.fetchNextPage()} disabled={businesses.isFetchingNextPage}>
                Load more
              </Button>
            )}
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6">Search history</Typography>
              <Stack spacing={1} sx={{ mt: 2 }}>
                {(history.data ?? []).map((item) => (
                  <Box key={item.id}>
                    <Typography>{item.category} · {item.location}</Typography>
                    <Typography color="text.secondary" variant="body2">
                      {item.persistedCount} persisted · {new Date(item.createdAt).toLocaleString()}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}

function BusinessCard({ business }: { business: IntelligenceBusiness }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction={{ xs: "column", sm: "row" }} sx={{ justifyContent: "space-between", gap: 2 }}>
          <Box>
            <Button component={Link} href={`/intelligence/${business.id}`}>
              {business.businessName}
            </Button>
            <Typography color="text.secondary">{business.address || "No address"}</Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }}>
              <Chip size="small" label={business.status} color={business.status === "ENRICHED" ? "success" : "warning"} />
              <Chip size="small" label={business.qualification || "UNQUALIFIED"} />
              <Chip size="small" label={`Score ${business.leadScore}`} />
            </Stack>
          </Box>
          <Box>
            <Typography>{business.phoneNumber || "No phone"}</Typography>
            <Typography>{business.website || "No website"}</Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

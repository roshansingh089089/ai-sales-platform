"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { api, LeadSearch, LeadSearchResult, Page } from "@/lib/api";

const activeStatuses = ["QUEUED", "BROWSER_STARTING", "SEARCHING", "EXPORTING", "DOWNLOADING", "IMPORTING"];

export default function LeadSearchesPage() {
  const [query, setQuery] = useState("dentists");
  const [location, setLocation] = useState("HSR Layout, Bengaluru");
  const [maximumResults, setMaximumResults] = useState(20);
  const [activeSearch, setActiveSearch] = useState<LeadSearch | null>(null);
  const [history, setHistory] = useState<LeadSearch[]>([]);
  const [results, setResults] = useState<LeadSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const isActive = activeSearch ? activeStatuses.includes(activeSearch.status) : false;

  async function refreshHistory() {
    const response = await api.get<Page<LeadSearch>>("/api/v1/lead-searches", { params: { size: 10 } });
    setHistory(response.data.content);
  }

  async function refreshSearch(id: string) {
    const [statusResponse, resultsResponse] = await Promise.all([
      api.get<LeadSearch>(`/api/v1/lead-searches/${id}/status`),
      api.get<Page<LeadSearchResult>>(`/api/v1/lead-searches/${id}/results`, { params: { size: 50 } }),
    ]);
    setActiveSearch(statusResponse.data);
    setResults(resultsResponse.data.content);
  }

  async function startSearch() {
    setError(null);
    setResults([]);
    try {
      const response = await api.post<LeadSearch>(
        "/api/v1/lead-searches",
        { query, location, maximumResults },
        { headers: { "Idempotency-Key": crypto.randomUUID() } },
      );
      setActiveSearch(response.data);
      await refreshHistory();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to start lead search");
    }
  }

  useEffect(() => {
    refreshHistory().catch(() => setError("Unable to load lead search history"));
  }, []);

  useEffect(() => {
    if (!activeSearch?.id) return;
    const interval = setInterval(() => {
      refreshSearch(activeSearch.id).catch(() => setError("Unable to refresh lead search progress"));
      refreshHistory().catch(() => undefined);
    }, isActive ? 1500 : 5000);
    return () => clearInterval(interval);
  }, [activeSearch?.id, isActive]);

  const statusColor = useMemo(() => {
    if (!activeSearch) return "default";
    if (activeSearch.status === "COMPLETED") return "success";
    if (activeSearch.status === "FAILED") return "error";
    return "info";
  }, [activeSearch]);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Lead Search
        </Typography>
        <Typography color="text.secondary">
          End-to-end fake-provider slice: create a search, watch automation progress, import CSV, and review canonical results.
        </Typography>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      <Card>
        <CardContent>
          <Grid container spacing={2} sx={{ alignItems: "center" }}>
            <Grid size={{ xs: 12, md: 5 }}>
              <TextField fullWidth label="Business type" value={query} onChange={(event) => setQuery(event.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <TextField fullWidth label="Location" value={location} onChange={(event) => setLocation(event.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <TextField
                fullWidth
                type="number"
                label="Max"
                value={maximumResults}
                slotProps={{ htmlInput: { min: 1, max: 20 } }}
                onChange={(event) => setMaximumResults(Number(event.target.value))}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Button variant="contained" onClick={startSearch} disabled={!query || !location || isActive}>
                Start Lead Search
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {activeSearch && (
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                <Typography variant="h6">Current search</Typography>
                <Chip color={statusColor} label={activeSearch.status} />
              </Stack>
              <LinearProgress variant="determinate" value={activeSearch.progressPercentage} />
              <Typography color="text.secondary">
                {activeSearch.query} near {activeSearch.location} · {activeSearch.resultCount} imported · {activeSearch.duplicateCount} duplicates
              </Typography>
              {activeSearch.failureMessage && <Alert severity="error">{activeSearch.failureMessage}</Alert>}
            </Stack>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Results
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Business</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>City</TableCell>
                <TableCell>Signals</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {results.map((result) => (
                <TableRow key={result.id} hover>
                  <TableCell>
                    <Link href={`/businesses/${result.businessId}`}>{result.businessName}</Link>
                  </TableCell>
                  <TableCell>{result.category}</TableCell>
                  <TableCell>{result.city}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Chip size="small" label="Phone" color={result.hasPhone ? "success" : "default"} />
                      <Chip size="small" label="Email" color={result.hasEmail ? "success" : "default"} />
                      <Chip size="small" label="Website" color={result.hasWebsite ? "success" : "default"} />
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Search history
          </Typography>
          <Table size="small">
            <TableBody>
              {history.map((item) => (
                <TableRow key={item.id} hover onClick={() => refreshSearch(item.id)}>
                  <TableCell>{item.query}</TableCell>
                  <TableCell>{item.location}</TableCell>
                  <TableCell>
                    <Chip size="small" label={item.status} />
                  </TableCell>
                  <TableCell>{item.resultCount} results</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Stack>
  );
}

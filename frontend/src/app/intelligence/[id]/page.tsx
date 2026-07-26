"use client";

import {
  Alert,
  Box,
  Breadcrumbs,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Link as MuiLink,
  Skeleton,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Typography,
} from "@mui/material";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { api, EnrichmentStatus, IntelligenceBusiness } from "@/lib/api";

export default function IntelligenceBusinessDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const business = useQuery({
    queryKey: ["intelligence-business", id],
    queryFn: () => api.get<IntelligenceBusiness>(`/api/v1/intelligence/businesses/${id}`).then((r) => r.data),
  });
  const status = useQuery({
    queryKey: ["intelligence-status", id],
    queryFn: () => api.get<EnrichmentStatus>(`/api/v1/intelligence/businesses/${id}/status`).then((r) => r.data),
    refetchInterval: 10_000,
  });

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
    const events = new EventSource(`${base}/api/v1/intelligence/businesses/${id}/events`);
    events.addEventListener("progress", () => {
      qc.invalidateQueries({ queryKey: ["intelligence-status", id] });
      qc.invalidateQueries({ queryKey: ["intelligence-business", id] });
    });
    return () => events.close();
  }, [id, qc]);

  if (business.isLoading) return <Skeleton height={300} />;
  if (business.isError || !business.data) return <Alert severity="error">Could not load business profile.</Alert>;

  const item = business.data;
  const progress = status.data;
  const percent = progress?.totalSteps ? Math.round((progress.completedSteps / progress.totalSteps) * 100) : 0;

  return (
    <Stack spacing={3}>
      <Breadcrumbs>
        <MuiLink component={Link} href="/intelligence">Intelligence</MuiLink>
        <Typography>{item.businessName}</Typography>
      </Breadcrumbs>
      <Card>
        <CardContent>
          <Stack direction={{ xs: "column", md: "row" }} sx={{ justifyContent: "space-between", gap: 3 }}>
            <Box>
              <Typography variant="h4">{item.businessName}</Typography>
              <Typography color="text.secondary">{item.address || "No address"}</Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap" }}>
                <Chip label={item.status} color={item.status === "ENRICHED" ? "success" : "warning"} />
                <Chip label={item.qualification || "UNQUALIFIED"} />
                <Chip label={`Lead score ${item.leadScore}`} />
              </Stack>
            </Box>
            <Box>
              <Typography><b>Phone:</b> {item.phoneNumber || "Missing"}</Typography>
              <Typography><b>Website:</b> {item.website || "Missing"}</Typography>
              <Typography><b>Sources:</b> {item.sources.map((s) => s.source).join(", ") || "—"}</Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <Typography variant="h6">Live enrichment progress</Typography>
          <LinearProgress variant="determinate" value={percent} sx={{ my: 2 }} />
          <Typography color="text.secondary">{progress?.completedSteps ?? 0} of {progress?.totalSteps ?? 0} steps complete</Typography>
          <Stepper orientation="vertical" sx={{ mt: 2 }}>
            {(progress?.steps ?? []).map((step) => (
              <Step key={step.stepName} active={step.status === "RUNNING"} completed={step.status === "COMPLETED"}>
                <StepLabel error={step.status === "FAILED"}>
                  {step.stepName} · {step.status}
                  {step.message ? ` · ${step.message}` : ""}
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <Typography variant="h6">Business profile</Typography>
          <Typography sx={{ mt: 1 }}><b>Categories:</b> {item.categories.join(", ") || "—"}</Typography>
          <Typography><b>Coordinates:</b> {item.latitude && item.longitude ? `${item.latitude}, ${item.longitude}` : "—"}</Typography>
          <Typography><b>Reasons:</b> {item.qualificationReasons.join(", ") || "—"}</Typography>
        </CardContent>
      </Card>
    </Stack>
  );
}

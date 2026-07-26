"use client";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Card,
  CardContent,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import { api, DashboardSummary } from "@/lib/api";
export default function Dashboard() {
  const q = useQuery({
    queryKey: ["dashboard"],
    queryFn: () =>
      api.get<DashboardSummary>("/dashboard/summary").then((r) => r.data),
  });
  if (q.isError)
    return (
      <Alert severity="error">
        Backend unavailable. Check the configured API URL.
      </Alert>
    );
  const d = q.data;
  const cards = [
    ["Total Businesses", d?.totalBusinesses],
    ["Contacts Ready", d?.contactsReady],
    ["Call Briefs Ready", d?.callBriefsReady],
    ["Interested Leads", d?.interestedLeads],
    ["Open Tasks", d?.openTasks],
  ];
  return (
    <Stack spacing={3}>
      <div>
        <Typography variant="h3">AI Business Assistant</Typography>
        <Typography color="text.secondary">
          Find opportunities, prepare better calls, and manage business
          follow-ups.
        </Typography>
      </div>
      <Grid container spacing={2}>
        {cards.map(([x, v]) => (
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }} key={x}>
            <Card>
              <CardContent>
                <Typography color="text.secondary">{x}</Typography>
                <Typography variant="h4">{v ?? "—"}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      <List
        title="Calls to Make Today"
        rows={(d?.callsToMakeToday ?? []).map(
          (x) => `${x.contactName} · ${x.businessName} — ${x.objective}`,
        )}
      />
      <List
        title="Recent Call Outcomes"
        rows={(d?.recentCallOutcomes ?? []).map(
          (x) => `${x.businessName} · ${x.contactName} — ${x.outcome}`,
        )}
      />
      <List
        title="Follow-up Tasks"
        rows={(d?.followUpTasks ?? []).map(
          (x) => `${x.title} — ${new Date(x.dueAt).toLocaleString()}`,
        )}
      />
      <List
        title="Businesses Requiring Attention"
        rows={(d?.businessesRequiringAttention ?? []).map(
          (x) => `${x.name} — ${x.reason}`,
        )}
      />
    </Stack>
  );
}
function List({ title, rows }: { title: string; rows: string[] }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6">{title}</Typography>
        {rows.length ? (
          rows.map((x) => (
            <Typography key={x} sx={{ mt: 1 }}>
              {x}
            </Typography>
          ))
        ) : (
          <Typography color="text.secondary">
            Nothing requiring attention.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

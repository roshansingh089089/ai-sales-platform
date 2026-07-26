"use client";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { api, CallActivity } from "@/lib/api";
export default function Page() {
  const [business, setBusiness] = useState(""),
    [outcome, setOutcome] = useState("");
  const q = useQuery({
    queryKey: ["calls"],
    queryFn: () =>
      api.get<CallActivity[]>("/call-activities").then((r) => r.data),
  });
  const businesses = [...new Set((q.data ?? []).map((c) => c.businessName))];
  const rows = (q.data ?? []).filter(
    (c) =>
      (!business || c.businessName === business) &&
      (!outcome || c.outcome === outcome),
  );
  return (
    <Stack spacing={2}>
      <Typography variant="h4">Call History</Typography>
      <Stack direction="row" spacing={2}>
        <TextField
          select
          label="Business"
          value={business}
          onChange={(e) => setBusiness(e.target.value)}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">All</MenuItem>
          {businesses.map((x) => (
            <MenuItem value={x} key={x}>
              {x}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Outcome"
          value={outcome}
          onChange={(e) => setOutcome(e.target.value)}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">All</MenuItem>
          {[
            "CONNECTED",
            "NO_ANSWER",
            "BUSY",
            "CALL_BACK_LATER",
            "WRONG_NUMBER",
            "NOT_INTERESTED",
            "INTERESTED",
            "MEETING_REQUESTED",
            "DO_NOT_CONTACT",
          ].map((x) => (
            <MenuItem value={x} key={x}>
              {x}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
      {rows.map((c) => (
        <Card key={c.id}>
          <CardContent>
            <Typography variant="h6">
              {c.businessName} · {c.contactName}
            </Typography>
            <Typography>
              {new Date(c.completedAt ?? c.createdAt).toLocaleString()} ·{" "}
              {c.outcome} · Interest {c.customerInterest}
            </Typography>
            <Typography>{c.summary || "No summary"}</Typography>
            <Typography color="text.secondary">
              {c.followUpRequired
                ? `Follow-up: ${c.followUpDate ? new Date(c.followUpDate).toLocaleString() : "required"}`
                : "No follow-up requested"}
            </Typography>
          </CardContent>
        </Card>
      ))}
      {!rows.length && (
        <Typography color="text.secondary">
          No matching call outcomes.
        </Typography>
      )}
    </Stack>
  );
}

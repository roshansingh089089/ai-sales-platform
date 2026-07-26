"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Card,
  CardActions,
  CardContent,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { useState } from "react";
import { api, CallBrief, DashboardSummary, ManualCall } from "@/lib/api";

const followUpOutcomes = ["CALL_BACK_LATER", "INTERESTED", "MEETING_REQUESTED"];
export function outcomeDefaults(outcome: string) {
  return followUpOutcomes.includes(outcome);
}

export default function CallPreparation() {
  const qc = useQueryClient();
  const summary = useQuery({
    queryKey: ["dashboard"],
    queryFn: () =>
      api.get<DashboardSummary>("/dashboard/summary").then((r) => r.data),
  });
  const [selected, setSelected] = useState<
      DashboardSummary["callsToMakeToday"][number] | null
    >(null),
    [brief, setBrief] = useState<CallBrief | null>(null),
    [manual, setManual] = useState<ManualCall | null>(null),
    [blocked, setBlocked] = useState(""),
    [outcomeOpen, setOutcomeOpen] = useState(false);
  const [outcome, setOutcome] = useState("CONNECTED"),
    [interest, setInterest] = useState("UNKNOWN"),
    [summaryText, setSummaryText] = useState(""),
    [notes, setNotes] = useState(""),
    [followUp, setFollowUp] = useState(false),
    [followUpDate, setFollowUpDate] = useState("");
  const prepare = useMutation({
    mutationFn: async (item: DashboardSummary["callsToMakeToday"][number]) => {
      const [m, b] = await Promise.all([
        api.get<ManualCall>(`/contacts/${item.contactId}/manual-call`),
        api.get<CallBrief>(`/call-briefs/${item.callBriefId}`),
      ]);
      return { m: m.data, b: b.data, item };
    },
    onSuccess: ({ m, b, item }) => {
      if (!m.allowed) {
        setBlocked(m.blockedReason ?? "Calling is blocked.");
        return;
      }
      setSelected(item);
      setBrief(b);
      setManual(m);
    },
    onError: () => setBlocked("Could not prepare this manual call."),
  });
  const record = useMutation({
    mutationFn: () =>
      api.post("/call-activities", {
        businessId: selected?.businessId,
        contactId: selected?.contactId,
        callBriefId: selected?.callBriefId,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        outcome,
        summary: summaryText,
        customerInterest: interest,
        followUpRequired: followUp,
        followUpDate: followUpDate
          ? new Date(followUpDate).toISOString()
          : null,
        notes,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["calls"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      setOutcomeOpen(false);
      setManual(null);
      setSelected(null);
    },
  });
  const changeOutcome = (value: string) => {
    setOutcome(value);
    if (outcomeDefaults(value)) setFollowUp(true);
  };
  const invalidFollowUp =
    followUp && (!followUpDate || new Date(followUpDate) <= new Date());
  return (
    <Stack spacing={3}>
      <Typography variant="h4">Call Preparation</Typography>
      <Alert severity="info">
        Calls remain fully manual. Your computer may open a configured calling
        application. You can also dial the displayed number manually from your
        phone.
      </Alert>
      {blocked && (
        <Alert severity="error" onClose={() => setBlocked("")}>
          {blocked}
        </Alert>
      )}
      {summary.isLoading && <Typography>Loading eligible calls…</Typography>}
      {summary.data?.callsToMakeToday.length === 0 && (
        <Card>
          <CardContent>
            <Typography>
              No READY call briefs are currently eligible. Add contacts and
              generate briefs from a business details page.
            </Typography>
            <Button component={Link} href="/businesses">
              Open businesses
            </Button>
          </CardContent>
        </Card>
      )}
      {summary.data?.callsToMakeToday.map((item) => (
        <Card key={item.callBriefId}>
          <CardContent>
            <Typography variant="h6">
              {item.contactName} · {item.businessName}
            </Typography>
            <Typography>{item.phoneNumber}</Typography>
            <Typography>{item.objective}</Typography>
            <Typography color="success.main">
              READY · Calling permitted by current summary criteria
            </Typography>
          </CardContent>
          <CardActions>
            <Button component={Link} href={`/businesses/${item.businessId}`}>
              Review brief
            </Button>
            <Button variant="contained" onClick={() => prepare.mutate(item)}>
              Call Now
            </Button>
          </CardActions>
        </Card>
      ))}
      <Dialog open={!!manual} onClose={() => setManual(null)} fullWidth>
        <DialogTitle>Confirm manual call</DialogTitle>
        <DialogContent>
          <Typography variant="h6">
            {manual?.contactName} · {selected?.businessName}
          </Typography>
          <Typography>{manual?.phoneNumber}</Typography>
          <Typography sx={{ mt: 2 }}>
            <b>Objective:</b> {brief?.objective}
          </Typography>
          <Typography sx={{ mt: 1 }}>
            <b>Introduction:</b> {brief?.introduction}
          </Typography>
          <Typography sx={{ mt: 1, whiteSpace: "pre-line" }}>
            <b>First talking points:</b>{" "}
            {brief?.keyTalkingPoints.split("\n").slice(0, 2).join("\n")}
          </Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            You are making this call manually. Respect all do-not-contact
            requests.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManual(null)}>Cancel</Button>
          <Button
            component="a"
            href={manual?.callUri}
            variant="contained"
            onClick={() => setOutcomeOpen(true)}
          >
            Open Phone Dialler
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={outcomeOpen}
        onClose={() => setOutcomeOpen(false)}
        fullWidth
      >
        <DialogTitle>Record Call Outcome</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Business"
              value={selected?.businessName ?? ""}
              disabled
            />
            <TextField
              label="Contact"
              value={selected?.contactName ?? ""}
              disabled
            />
            <TextField
              select
              label="Outcome"
              value={outcome}
              onChange={(e) => changeOutcome(e.target.value)}
            >
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
            {outcome === "DO_NOT_CONTACT" && (
              <Alert severity="error">
                Submitting this outcome blocks future call preparation for this
                contact.
              </Alert>
            )}
            <TextField
              select
              label="Customer interest"
              value={interest}
              onChange={(e) => setInterest(e.target.value)}
            >
              {["UNKNOWN", "LOW", "MEDIUM", "HIGH"].map((x) => (
                <MenuItem value={x} key={x}>
                  {x}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Summary"
              multiline
              value={summaryText}
              onChange={(e) => setSummaryText(e.target.value)}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={followUp}
                  onChange={(e) => setFollowUp(e.target.checked)}
                />
              }
              label="Follow-up required"
            />
            {followUp && (
              <TextField
                label="Follow-up date"
                type="datetime-local"
                slotProps={{ inputLabel: { shrink: true } }}
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                error={invalidFollowUp}
                helperText={
                  invalidFollowUp ? "Choose a future date and time." : ""
                }
              />
            )}
            <TextField
              label="Notes"
              multiline
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOutcomeOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={invalidFollowUp || record.isPending}
            onClick={() => record.mutate()}
          >
            Save outcome
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link as MuiLink,
  MenuItem,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import axios from "axios";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { FieldValues, Path, useForm, UseFormSetError } from "react-hook-form";
import { z } from "zod";
import {
  api,
  Business,
  CallActivity,
  CallBrief,
  Contact,
  Opportunity,
  Task,
} from "@/lib/api";

const contactSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string(),
  designation: z.string(),
  phoneNumber: z
    .string()
    .regex(/^$|^\+?[0-9]{7,15}$/, "Use 7–15 digits with an optional +"),
  email: z.string().email().or(z.literal("")),
  preferredContactMethod: z.enum(["PHONE", "EMAIL", "UNKNOWN"]),
  notes: z.string(),
  doNotContact: z.boolean(),
});
const opportunitySchema = z.object({
  title: z.string().min(1),
  problemStatement: z.string().min(1),
  proposedSolution: z.string().min(1),
  confidenceScore: z.number().min(0).max(1),
  evidence: z.string(),
  status: z.enum(["DRAFT", "VALIDATED", "REJECTED"]),
});
type ContactForm = z.infer<typeof contactSchema>;
type OpportunityForm = z.infer<typeof opportunitySchema>;
const defaults: ContactForm = {
  firstName: "",
  lastName: "",
  designation: "",
  phoneNumber: "",
  email: "",
  preferredContactMethod: "UNKNOWN",
  notes: "",
  doNotContact: false,
};

export default function BusinessDetails() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [tab, setTab] = useState(0),
    [contactOpen, setContactOpen] = useState(false),
    [opportunityOpen, setOpportunityOpen] = useState(false),
    [editing, setEditing] = useState<Contact | null>(null),
    [message, setMessage] = useState(""),
    [pendingContact, setPendingContact] = useState<ContactForm | null>(null);
  const results = useQueries({
    queries: [
      {
        queryKey: ["business", id],
        queryFn: () =>
          api.get<Business>(`/businesses/${id}`).then((r) => r.data),
      },
      {
        queryKey: ["contacts", id],
        queryFn: () =>
          api.get<Contact[]>(`/businesses/${id}/contacts`).then((r) => r.data),
      },
      {
        queryKey: ["opportunities", id],
        queryFn: () =>
          api
            .get<Opportunity[]>(`/businesses/${id}/opportunities`)
            .then((r) => r.data),
      },
      {
        queryKey: ["briefs", id],
        queryFn: () =>
          api
            .get<CallBrief[]>(`/businesses/${id}/call-briefs`)
            .then((r) => r.data),
      },
      {
        queryKey: ["calls", id],
        queryFn: () =>
          api
            .get<CallActivity[]>(`/businesses/${id}/call-activities`)
            .then((r) => r.data),
      },
      {
        queryKey: ["tasks"],
        queryFn: () => api.get<Task[]>("/tasks").then((r) => r.data),
      },
    ],
  });
  const [businessQ, contactsQ, opportunitiesQ, briefsQ, callsQ, tasksQ] =
    results;
  const business = businessQ.data,
    contacts = contactsQ.data ?? [],
    opportunities = opportunitiesQ.data ?? [],
    briefs = briefsQ.data ?? [],
    calls = callsQ.data ?? [],
    tasks = (tasksQ.data ?? []).filter((t) => t.businessId === id);
  const cf = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: defaults,
  });
  const of = useForm<OpportunityForm>({
    resolver: zodResolver(opportunitySchema),
    defaultValues: {
      title: "",
      problemStatement: "",
      proposedSolution: "",
      confidenceScore: 0.5,
      evidence: "",
      status: "DRAFT",
    },
  });
  const contactSave = useMutation({
    mutationFn: (v: ContactForm) =>
      editing
        ? api.put(`/contacts/${editing.id}`, v)
        : api.post(`/businesses/${id}/contacts`, v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts", id] });
      setContactOpen(false);
      setEditing(null);
      cf.reset(defaults);
      setMessage("Contact saved.");
    },
    onError: (e) => mapErrors(e, cf.setError),
  });
  const opportunitySave = useMutation({
    mutationFn: (v: OpportunityForm) =>
      api.post(`/businesses/${id}/opportunities`, v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["opportunities", id] });
      setOpportunityOpen(false);
      of.reset();
      setMessage("Opportunity added.");
    },
    onError: (e) => mapErrors(e, of.setError),
  });
  const refresh = () => results.forEach((r) => r.refetch());
  if (results.some((r) => r.isLoading))
    return (
      <Stack spacing={2}>
        <Skeleton height={50} />
        <Skeleton height={180} />
        <Skeleton height={300} />
      </Stack>
    );
  if (businessQ.isError) {
    const missing =
      axios.isAxiosError(businessQ.error) &&
      businessQ.error.response?.status === 404;
    return (
      <Alert severity={missing ? "warning" : "error"}>
        {missing ? "Business not found." : "Could not load this business."}
      </Alert>
    );
  }
  if (!business) return null;
  const openEdit = (c: Contact) => {
    setEditing(c);
    cf.reset({
      ...defaults,
      ...c,
      lastName: c.lastName ?? "",
      designation: c.designation ?? "",
      phoneNumber: c.phoneNumber ?? "",
      email: c.email ?? "",
      notes: c.notes ?? "",
    });
    setContactOpen(true);
  };
  return (
    <Stack spacing={3}>
      <Breadcrumbs>
        <MuiLink component={Link} href="/businesses">
          Businesses
        </MuiLink>
        <Typography>{business.name}</Typography>
      </Breadcrumbs>
      <Stack
        direction="row"
        sx={{ justifyContent: "space-between", alignItems: "center" }}
      >
        <Box>
          <Typography variant="h4">{business.name}</Typography>
          <Chip
            label={business.status}
            color={business.status === "DO_NOT_CONTACT" ? "error" : "default"}
          />
        </Box>
        <Button onClick={refresh}>Refresh</Button>
      </Stack>
      {message && (
        <Alert severity="success" onClose={() => setMessage("")}>
          {message}
        </Alert>
      )}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable">
        {[
          "Overview",
          "Contacts",
          "Opportunities",
          "Call Briefs",
          "Call History",
          "Tasks",
        ].map((x) => (
          <Tab label={x} key={x} />
        ))}
      </Tabs>
      {tab === 0 && (
        <Card>
          <CardContent>
            <Info label="Website" value={business.website} />
            <Info label="Industry" value={business.industry} />
            <Info
              label="Location"
              value={[business.city, business.state, business.country]
                .filter(Boolean)
                .join(", ")}
            />
            <Info label="Description" value={business.description} />
            <Info label="Source" value={business.source} />
            <Info label="Created" value={local(business.createdAt)} />
            <Info label="Updated" value={local(business.updatedAt)} />
          </CardContent>
        </Card>
      )}
      {tab === 1 && (
        <Section
          title="Contacts"
          action={
            <Button
              variant="contained"
              onClick={() => {
                setEditing(null);
                cf.reset(defaults);
                setContactOpen(true);
              }}
            >
              Add contact
            </Button>
          }
        >
          {contacts.length ? (
            contacts.map((c) => (
              <Card key={c.id} variant="outlined">
                <CardContent>
                  <Stack
                    direction="row"
                    sx={{ justifyContent: "space-between" }}
                  >
                    <Box>
                      <Typography variant="h6">{c.fullName}</Typography>
                      <Typography>
                        {c.designation || "No designation"} ·{" "}
                        {c.phoneNumber || "No phone"}
                      </Typography>
                    </Box>
                    <Button onClick={() => openEdit(c)}>Edit</Button>
                  </Stack>
                  {c.doNotContact && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      Do not contact. Call preparation is blocked.
                    </Alert>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Empty text="No contacts yet." />
          )}
        </Section>
      )}
      {tab === 2 && (
        <Section
          title="Opportunities"
          action={
            <Button
              variant="contained"
              onClick={() => setOpportunityOpen(true)}
            >
              Add opportunity
            </Button>
          }
        >
          {opportunities.length ? (
            opportunities.map((o) => (
              <Card key={o.id} variant="outlined">
                <CardContent>
                  <Typography variant="h6">
                    {o.title} <Chip size="small" label={o.status} />
                  </Typography>
                  <Typography sx={{ mt: 1 }}>
                    <b>Problem:</b> {o.problemStatement}
                  </Typography>
                  <Typography>
                    <b>Proposed solution:</b> {o.proposedSolution}
                  </Typography>
                  <Typography color="text.secondary">
                    Confidence: {o.confidenceScore ?? "Not scored"} ·
                    Human-entered opportunity
                  </Typography>
                </CardContent>
              </Card>
            ))
          ) : (
            <Empty text="No opportunities yet." />
          )}
        </Section>
      )}
      {tab === 3 && (
        <Section title="Call Briefs">
          <GenerateBrief
            contacts={contacts}
            opportunities={opportunities}
            onGenerated={() =>
              qc.invalidateQueries({ queryKey: ["briefs", id] })
            }
          />
          {briefs.length ? (
            briefs.map((b) => (
              <BriefCard
                key={b.id}
                brief={b}
                contacts={contacts}
                opportunities={opportunities}
                onChanged={() =>
                  qc.invalidateQueries({ queryKey: ["briefs", id] })
                }
              />
            ))
          ) : (
            <Empty text="Select a contact and opportunity to generate a local deterministic brief." />
          )}
        </Section>
      )}
      {tab === 4 && (
        <Section title="Call History">
          {calls.length ? (
            calls.map((c) => (
              <Card key={c.id} variant="outlined">
                <CardContent>
                  <Typography variant="h6">
                    {c.outcome} · {local(c.completedAt ?? c.createdAt)}
                  </Typography>
                  <Typography>
                    {c.contactName} · Interest: {c.customerInterest}
                  </Typography>
                  <Typography>{c.summary || "No summary"}</Typography>
                </CardContent>
              </Card>
            ))
          ) : (
            <Empty text="No call outcomes recorded." />
          )}
        </Section>
      )}
      {tab === 5 && (
        <Section title="Tasks">
          {tasks.length ? (
            tasks.map((t) => (
              <Card key={t.id} variant="outlined">
                <CardContent>
                  <Typography variant="h6">{t.title}</Typography>
                  <Typography>
                    {local(t.dueAt)} · {t.priority} · {t.status}
                  </Typography>
                </CardContent>
              </Card>
            ))
          ) : (
            <Empty text="No tasks for this business." />
          )}
        </Section>
      )}
      <Dialog
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        fullWidth
      >
        <form
          onSubmit={cf.handleSubmit((v) =>
            v.doNotContact && !editing?.doNotContact
              ? setPendingContact(v)
              : contactSave.mutate(v),
          )}
        >
          <DialogTitle>{editing ? "Edit" : "Add"} contact</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {(
                [
                  "firstName",
                  "lastName",
                  "designation",
                  "phoneNumber",
                  "email",
                  "notes",
                ] as const
              ).map((k) => (
                <TextField
                  key={k}
                  label={label(k)}
                  multiline={k === "notes"}
                  error={!!cf.formState.errors[k]}
                  helperText={cf.formState.errors[k]?.message}
                  {...cf.register(k)}
                />
              ))}
              <TextField
                select
                label="Preferred contact method"
                defaultValue={cf.getValues("preferredContactMethod")}
                {...cf.register("preferredContactMethod")}
              >
                {["PHONE", "EMAIL", "UNKNOWN"].map((x) => (
                  <MenuItem value={x} key={x}>
                    {x}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Do-not-contact"
                defaultValue={String(cf.getValues("doNotContact"))}
                onChange={(e) =>
                  cf.setValue("doNotContact", e.target.value === "true")
                }
              >
                <MenuItem value="false">Calling allowed</MenuItem>
                <MenuItem value="true">Do not contact</MenuItem>
              </TextField>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setContactOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">
              Save
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      <Dialog open={!!pendingContact} onClose={() => setPendingContact(null)}>
        <DialogTitle>Confirm do-not-contact</DialogTitle>
        <DialogContent>
          <Alert severity="warning">
            Future call preparation will be blocked for this contact. Existing
            history will be preserved.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingContact(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              if (pendingContact) contactSave.mutate(pendingContact);
              setPendingContact(null);
            }}
          >
            Confirm do-not-contact
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={opportunityOpen}
        onClose={() => setOpportunityOpen(false)}
        fullWidth
      >
        <form onSubmit={of.handleSubmit((v) => opportunitySave.mutate(v))}>
          <DialogTitle>Add opportunity</DialogTitle>
          <DialogContent>
            <Alert severity="info" sx={{ mb: 2 }}>
              This opportunity is entered by you; no external AI is used.
            </Alert>
            <Stack spacing={2}>
              {(
                [
                  "title",
                  "problemStatement",
                  "proposedSolution",
                  "confidenceScore",
                  "evidence",
                ] as const
              ).map((k) => (
                <TextField
                  key={k}
                  label={label(k)}
                  type={k === "confidenceScore" ? "number" : undefined}
                  multiline={[
                    "problemStatement",
                    "proposedSolution",
                    "evidence",
                  ].includes(k)}
                  error={!!of.formState.errors[k]}
                  helperText={
                    of.formState.errors[k]?.message ||
                    (k === "confidenceScore" ? "Value from 0 to 1" : "")
                  }
                  {...of.register(
                    k,
                    k === "confidenceScore"
                      ? { valueAsNumber: true }
                      : undefined,
                  )}
                />
              ))}
              <TextField
                select
                label="Status"
                defaultValue="DRAFT"
                {...of.register("status")}
              >
                {["DRAFT", "VALIDATED", "REJECTED"].map((x) => (
                  <MenuItem value={x} key={x}>
                    {x}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpportunityOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">
              Save
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Stack>
  );
}
function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: "space-between" }}>
        <Typography variant="h5">{title}</Typography>
        {action}
      </Stack>
      {children}
    </Stack>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography color="text.secondary">{text}</Typography>
      </CardContent>
    </Card>
  );
}
function Info({ label, value }: { label: string; value?: string }) {
  return (
    <Typography sx={{ mb: 1 }}>
      <b>{label}:</b> {value || "—"}
    </Typography>
  );
}
function local(value?: string) {
  return value ? new Date(value).toLocaleString() : "—";
}
function label(v: string) {
  return v.replace(/([A-Z])/g, " $1").replace(/^./, (x) => x.toUpperCase());
}
function mapErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
) {
  if (axios.isAxiosError(error)) {
    for (const item of error.response?.data?.fieldErrors ?? [])
      setError(item.field as Path<T>, { message: item.message });
  }
}
function BriefCard({
  brief,
  contacts,
  opportunities,
  onChanged,
}: {
  brief: CallBrief;
  contacts: Contact[];
  opportunities: Opportunity[];
  onChanged: () => void;
}) {
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState(brief);
  const save = useMutation({
    mutationFn: () => api.put(`/call-briefs/${brief.id}`, form),
    onSuccess: () => {
      setEdit(false);
      onChanged();
    },
  });
  const ready = useMutation({
    mutationFn: () => api.post(`/call-briefs/${brief.id}/ready`),
    onSuccess: onChanged,
  });
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6">
          {contacts.find((c) => c.id === brief.contactId)?.fullName ??
            "Contact"}{" "}
          ·{" "}
          {opportunities.find((o) => o.id === brief.opportunityId)?.title ??
            "General opportunity"}{" "}
          <Chip size="small" label={brief.status} />
        </Typography>
        {edit ? (
          <Stack spacing={2} sx={{ mt: 2 }}>
            {(
              [
                "objective",
                "introduction",
                "keyTalkingPoints",
                "discoveryQuestions",
                "likelyObjections",
                "suggestedResponses",
                "nextBestAction",
              ] as const
            ).map((k) => (
              <TextField
                multiline
                minRows={2}
                label={label(k)}
                value={form[k]}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                key={k}
              />
            ))}
            <Button onClick={() => save.mutate()} variant="contained">
              Save brief
            </Button>
          </Stack>
        ) : (
          <>
            <Typography sx={{ mt: 1 }}>{brief.objective}</Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Button onClick={() => setEdit(true)}>Review and edit</Button>
              {brief.status === "DRAFT" && (
                <Button variant="contained" onClick={() => ready.mutate()}>
                  Mark ready
                </Button>
              )}
            </Stack>
          </>
        )}
      </CardContent>
    </Card>
  );
}
function GenerateBrief({
  contacts,
  opportunities,
  onGenerated,
}: {
  contacts: Contact[];
  opportunities: Opportunity[];
  onGenerated: () => void;
}) {
  const [contactId, setContactId] = useState(""),
    [opportunityId, setOpportunityId] = useState("");
  const mutation = useMutation({
    mutationFn: () =>
      api.post(
        `/contacts/${contactId}/call-briefs/generate`,
        opportunityId ? { opportunityId } : {},
      ),
    onSuccess: onGenerated,
  });
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6">Generate deterministic local brief</Typography>
        <Stack direction="row" spacing={2} sx={{ mt: 2, flexWrap: "wrap" }}>
          <TextField
            select
            label="Contact"
            value={contactId}
            onChange={(e) => setContactId(e.target.value)}
            sx={{ minWidth: 220 }}
          >
            {contacts
              .filter((c) => !c.doNotContact)
              .map((c) => (
                <MenuItem value={c.id} key={c.id}>
                  {c.fullName}
                </MenuItem>
              ))}
          </TextField>
          <TextField
            select
            label="Opportunity"
            value={opportunityId}
            onChange={(e) => setOpportunityId(e.target.value)}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value="">General conversation</MenuItem>
            {opportunities.map((o) => (
              <MenuItem value={o.id} key={o.id}>
                {o.title}
              </MenuItem>
            ))}
          </TextField>
          <Button
            variant="contained"
            disabled={!contactId || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            Generate brief
          </Button>
        </Stack>
        {contacts.some((c) => c.doNotContact) && (
          <Typography color="error" sx={{ mt: 1 }}>
            Do-not-contact contacts are excluded.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { api, Business, Page } from "@/lib/api";
import Link from "next/link";
const schema = z.object({
  name: z.string().min(1, "Business name is required"),
  website: z.string().url().or(z.literal("")),
  industry: z.string(),
  city: z.string(),
  state: z.string(),
  country: z.string(),
  description: z.string(),
});
type Form = z.infer<typeof schema>;
export default function Businesses() {
  const [open, setOpen] = useState(false),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState("");
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["businesses"],
    queryFn: () => api.get<Page<Business>>("/businesses").then((r) => r.data),
  });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      website: "",
      industry: "",
      city: "",
      state: "",
      country: "",
      description: "",
    },
  });
  const create = useMutation({
    mutationFn: (data: Form) => api.post("/businesses", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["businesses"] });
      setOpen(false);
      reset();
    },
  });
  const rows = (query.data?.content ?? []).filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) &&
      (!status || b.status === status),
  );
  return (
    <Stack spacing={3}>
      <Stack direction="row" sx={{ justifyContent: "space-between" }}>
        <Typography variant="h4">Businesses</Typography>
        <Button variant="contained" onClick={() => setOpen(true)}>
          Add business
        </Button>
      </Stack>
      <Stack
        direction="row"
        spacing={2}
        sx={{ flexDirection: { xs: "column", sm: "row" } }}
      >
        <TextField
          label="Search by name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <TextField
          select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">All</MenuItem>
          {[
            "NEW",
            "RESEARCH_PENDING",
            "RESEARCHED",
            "CONTACT_READY",
            "CONTACTED",
            "QUALIFIED",
            "NOT_INTERESTED",
            "DO_NOT_CONTACT",
          ].map((x) => (
            <MenuItem value={x} key={x}>
              {x}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
      {query.isError && (
        <Alert severity="error">Could not load businesses.</Alert>
      )}
      <Card>
        <CardContent>
          {rows.length === 0 ? (
            <Typography color="text.secondary">No businesses found.</Typography>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Industry</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <Button component={Link} href={`/businesses/${b.id}`}>
                        {b.name}
                      </Button>
                    </TableCell>
                    <TableCell>{b.industry || "—"}</TableCell>
                    <TableCell>
                      {[b.city, b.country].filter(Boolean).join(", ") || "—"}
                    </TableCell>
                    <TableCell>{b.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <form onSubmit={handleSubmit((v) => create.mutate(v))}>
          <DialogTitle>Add business</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {(
                [
                  "name",
                  "website",
                  "industry",
                  "city",
                  "state",
                  "country",
                  "description",
                ] as const
              ).map((k) => (
                <TextField
                  key={k}
                  label={k.replace(/^./, (x) => x.toUpperCase())}
                  multiline={k === "description"}
                  rows={k === "description" ? 3 : undefined}
                  error={!!errors[k]}
                  helperText={errors[k]?.message}
                  {...register(k)}
                />
              ))}
            </Stack>
            {create.isError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                Could not create business.
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={create.isPending}
            >
              Save
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Stack>
  );
}

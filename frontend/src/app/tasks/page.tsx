"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import { api, Task } from "@/lib/api";
export default function Page() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["tasks"],
    queryFn: () => api.get<Task[]>("/tasks").then((r) => r.data),
  });
  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.put(`/tasks/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
  const now = new Date(),
    today = now.toDateString();
  const groups = [
    [
      "Overdue",
      (t: Task) =>
        !["COMPLETED", "CANCELLED"].includes(t.status) &&
        new Date(t.dueAt) < now,
    ],
    [
      "Due today",
      (t: Task) =>
        !["COMPLETED", "CANCELLED"].includes(t.status) &&
        new Date(t.dueAt).toDateString() === today,
    ],
    [
      "Upcoming",
      (t: Task) =>
        !["COMPLETED", "CANCELLED"].includes(t.status) &&
        new Date(t.dueAt) > now &&
        new Date(t.dueAt).toDateString() !== today,
    ],
    ["Completed", (t: Task) => t.status === "COMPLETED"],
  ] as const;
  return (
    <Stack spacing={3}>
      <Typography variant="h4">Tasks</Typography>
      {groups.map(([name, test]) => (
        <Stack spacing={1} key={name}>
          <Typography variant="h5">{name}</Typography>
          {(q.data ?? []).filter(test).map((t) => (
            <Card key={t.id}>
              <CardContent>
                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <div>
                    <Typography variant="h6">{t.title}</Typography>
                    <Typography>
                      {t.businessName}
                      {t.contactName ? ` · ${t.contactName}` : ""}
                    </Typography>
                    <Typography>{t.description || "No description"}</Typography>
                    <Typography>
                      {new Date(t.dueAt).toLocaleString()} · Origin:{" "}
                      {t.originatingOutcome ?? "Manual"}
                    </Typography>
                  </div>
                  <Stack spacing={1}>
                    <Chip label={`${t.priority} · ${t.status}`} />
                    {t.status !== "COMPLETED" && (
                      <Button
                        onClick={() =>
                          update.mutate({ id: t.id, status: "COMPLETED" })
                        }
                      >
                        Complete
                      </Button>
                    )}
                    {t.status === "OPEN" && (
                      <Button
                        onClick={() =>
                          update.mutate({ id: t.id, status: "IN_PROGRESS" })
                        }
                      >
                        Start
                      </Button>
                    )}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
          {!(q.data ?? []).some(test) && (
            <Typography color="text.secondary">
              No {name.toLowerCase()} tasks.
            </Typography>
          )}
        </Stack>
      ))}
    </Stack>
  );
}

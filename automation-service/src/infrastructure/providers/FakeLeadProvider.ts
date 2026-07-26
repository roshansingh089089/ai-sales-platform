import { createHash } from "node:crypto";
import { ExportedLeadFile, LeadAutomationProvider, ProgressReporter } from "../../application/LeadAutomationProvider.js";
import { SearchJob } from "../../domain/SearchJob.js";

export class FakeLeadProvider implements LeadAutomationProvider {
  name(): string {
    return "fake";
  }

  async run(job: SearchJob, progress: ProgressReporter = async () => undefined): Promise<ExportedLeadFile> {
    await progress("BROWSER_STARTING", "Fake browser session prepared");
    await delay(100);
    await progress("SEARCHING", `Searching ${job.query} near ${job.location}`);
    await delay(100);
    await progress("EXPORTING", "Building deterministic fake lead export");
    const content = toCsv(fakeRows(job).slice(0, Math.max(1, Math.min(job.maxResults, 20))));
    await delay(100);
    await progress("DOWNLOADING", "Fake CSV export ready for import");
    return {
      jobId: job.id,
      filename: `${job.id}-fake-leads.csv`,
      content,
      checksum: createHash("sha256").update(content).digest("hex"),
      rowCount: Math.max(0, content.split("\n").length - 2),
    };
  }
}

function fakeRows(job: SearchJob): Record<string, string>[] {
  const safeLocation = job.location.replaceAll(",", " ");
  return Array.from({ length: 20 }, (_, index) => {
    const n = index + 1;
    return {
      business_name: `${title(job.query)} ${n}`,
      category: job.query,
      address: `${100 + n} ${safeLocation}`,
      city: cityFrom(job.location),
      state: "Karnataka",
      country: "India",
      postal_code: `5600${String(n).padStart(2, "0")}`,
      phone: `+9180${String(40000000 + n).padStart(8, "0")}`,
      email: `hello${n}@fakelead${n}.example`,
      website: `https://fakelead${n}.example`,
      rating: `${3.5 + (n % 10) / 10}`,
      review_count: `${25 + n}`,
      latitude: `${12.9100 + n / 10000}`,
      longitude: `${77.6400 + n / 10000}`,
      source_external_id: `fake-${job.id}-${n}`,
      source_url: `https://fake.local/${job.id}/${n}`,
    };
  });
}

function toCsv(rows: Record<string, string>[]): string {
  const headers = [
    "business_name",
    "category",
    "address",
    "city",
    "state",
    "country",
    "postal_code",
    "phone",
    "email",
    "website",
    "rating",
    "review_count",
    "latitude",
    "longitude",
    "source_external_id",
    "source_url",
  ];
  const lines = [headers.join(",")];
  for (const row of rows) lines.push(headers.map((header) => quote(row[header] ?? "")).join(","));
  lines.push("");
  return lines.join("\n");
}

function quote(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function title(value: string): string {
  return value.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

function cityFrom(location: string): string {
  return location.split(",").at(-1)?.trim() || location;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

package com.roslabs.aisales.lead.application;

import com.roslabs.aisales.lead.configuration.LeadServiceProperties;
import com.roslabs.aisales.lead.domain.*;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import org.slf4j.*;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class SearchJobService {
  private static final Logger log = LoggerFactory.getLogger(SearchJobService.class);
  private static final int MAX_RESULTS = 20;
  private final SearchJobRepository repository;
  private final LeadImportBatchRepository importBatches;
  private final LeadSearchResultRepository searchResults;
  private final AutomationDispatchClient automationDispatchClient;
  private final BusinessServiceClient businessServiceClient;
  private final LeadServiceProperties properties;

  public SearchJobService(
      SearchJobRepository repository,
      LeadImportBatchRepository importBatches,
      LeadSearchResultRepository searchResults,
      AutomationDispatchClient automationDispatchClient,
      BusinessServiceClient businessServiceClient,
      LeadServiceProperties properties) {
    this.repository = repository;
    this.importBatches = importBatches;
    this.searchResults = searchResults;
    this.automationDispatchClient = automationDispatchClient;
    this.businessServiceClient = businessServiceClient;
    this.properties = properties;
  }

  @Transactional
  public SearchJob create(String query, String location, int maximumResults, String idempotencyKey) {
    if (idempotencyKey != null && !idempotencyKey.isBlank()) {
      var existing = repository.findByIdempotencyKey(idempotencyKey.trim());
      if (existing.isPresent()) return existing.get();
    }
    var job = repository.save(new SearchJob(query, location, Math.min(maximumResults, MAX_RESULTS), clean(idempotencyKey)));
    CompletableFuture.runAsync(() -> dispatch(job.getId()));
    return job;
  }

  public void dispatch(UUID jobId) {
    var job = repository.findById(jobId).orElseThrow();
    try {
      automationDispatchClient.dispatch(job);
      log.info("lead_search_dispatch_succeeded jobId={} maxResults={}", job.getId(), job.getMaxResults());
    } catch (Exception error) {
      log.error("lead_search_dispatch_failed jobId={} reason={}", job.getId(), error.getMessage());
      fail(job.getId(), "DISPATCH_FAILED", error.getMessage());
    }
  }

  @Transactional(readOnly = true)
  public SearchJob get(UUID id) {
    return repository.findById(id).orElseThrow(() -> new IllegalArgumentException("Lead search not found"));
  }

  @Transactional(readOnly = true)
  public Page<SearchJob> list(int page, int size) {
    return repository.findAll(PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
  }

  @Transactional
  public SearchJob transition(UUID id, SearchJobStatus status, String message) {
    var job = get(id);
    job.transitionTo(status, message == null ? "Automation progress update" : message);
    return repository.save(job);
  }

  @Transactional
  public SearchJob fail(UUID id, String code, String message) {
    var job = get(id);
    job.transitionTo(SearchJobStatus.FAILED, code + ": " + message);
    return repository.save(job);
  }

  @Transactional
  public ImportSummary importCsv(
      UUID jobId,
      String provider,
      String originalFilename,
      String providedChecksum,
      Integer declaredRecordCount,
      MultipartFile file) {
    var job = get(jobId);
    if (file == null || file.isEmpty()) throw new IllegalArgumentException("CSV file is required");
    if (file.getSize() > properties.importSettings().maxFileSize().toBytes()) {
      throw new IllegalArgumentException("CSV file exceeds configured maximum size");
    }

    try {
      var bytes = file.getBytes();
      var checksum = sha256(bytes);
      if (providedChecksum != null && !providedChecksum.isBlank() && !providedChecksum.equalsIgnoreCase(checksum)) {
        throw new IllegalArgumentException("CSV checksum does not match uploaded content");
      }
      var existing = importBatches.findByJobAndProviderAndChecksum(job, provider, checksum);
      if (existing.isPresent()) {
        var batch = existing.get();
        return new ImportSummary(batch.getId(), checksum, batch.getAcceptedRows(), batch.getRejectedRows(), 0);
      }
      if (job.getStatus() == SearchJobStatus.DOWNLOADING) job.transitionTo(SearchJobStatus.IMPORTING, "CSV import started");
      var rows = parseCsv(new String(bytes, StandardCharsets.UTF_8));
      var batch =
          importBatches.save(
              new LeadImportBatch(
                  job,
                  provider,
                  originalFilename == null ? file.getOriginalFilename() : originalFilename,
                  checksum,
                  declaredRecordCount,
                  0,
                  0));
      var accepted = 0;
      var rejected = 0;
      var duplicates = 0;
      for (var row : rows) {
        var business = toBusiness(provider, row);
        if (business == null) {
          rejected++;
          continue;
        }
        var businessId = businessServiceClient.upsert(business);
        if (searchResults.existsByJobAndBusinessId(job, businessId)) {
          duplicates++;
          continue;
        }
        searchResults.save(
            new LeadSearchResult(
                job,
                businessId,
                batch,
                provider,
                business.sourceRef(),
                business.name(),
                business.category(),
                business.city(),
                notBlank(business.phoneNumber()),
                notBlank(business.email()),
                notBlank(business.website())));
        accepted++;
      }
      batch.complete(accepted, rejected);
      batch = importBatches.save(batch);
      job.completeImport(accepted, duplicates);
      repository.save(job);
      log.info(
          "lead_search_import_completed jobId={} provider={} accepted={} rejected={} duplicates={} checksum={}",
          jobId,
          provider,
          accepted,
          rejected,
          duplicates,
          checksum);
      return new ImportSummary(batch.getId(), checksum, accepted, rejected, duplicates);
    } catch (IOException error) {
      throw new IllegalArgumentException("Unable to read CSV file", error);
    }
  }

  @Transactional(readOnly = true)
  public Page<LeadSearchResult> results(
      UUID jobId,
      String q,
      String category,
      String city,
      Boolean hasPhone,
      Boolean hasEmail,
      Boolean hasWebsite,
      int page,
      int size) {
    var job = get(jobId);
    return searchResults.search(
        job,
        q,
        category,
        city,
        hasPhone,
        hasEmail,
        hasWebsite,
        PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
  }

  public record ImportSummary(UUID batchId, String checksum, int acceptedRows, int rejectedRows, int duplicateRows) {}

  private BusinessServiceClient.DiscoveredBusiness toBusiness(String provider, Map<String, String> row) {
    var name = value(row, "business_name");
    if (!notBlank(name)) return null;
    return new BusinessServiceClient.DiscoveredBusiness(
        name,
        value(row, "website"),
        value(row, "phone"),
        value(row, "email"),
        value(row, "address"),
        value(row, "city"),
        value(row, "state"),
        value(row, "country"),
        value(row, "postal_code"),
        value(row, "category"),
        provider,
        value(row, "source_external_id"),
        value(row, "source_url"),
        doubleValue(row, "rating"),
        intValue(row, "review_count"),
        doubleValue(row, "latitude"),
        doubleValue(row, "longitude"));
  }

  private List<Map<String, String>> parseCsv(String text) {
    var lines = text.replace("\r\n", "\n").replace('\r', '\n').split("\n");
    if (lines.length < 2) return List.of();
    var headers = splitCsvLine(lines[0]);
    var rows = new ArrayList<Map<String, String>>();
    for (var i = 1; i < lines.length; i++) {
      if (lines[i].isBlank()) continue;
      var values = splitCsvLine(lines[i]);
      var row = new LinkedHashMap<String, String>();
      for (var j = 0; j < headers.size(); j++) row.put(headers.get(j), j < values.size() ? clean(values.get(j)) : null);
      rows.add(row);
    }
    return rows;
  }

  private List<String> splitCsvLine(String line) {
    var values = new ArrayList<String>();
    var current = new StringBuilder();
    var quoted = false;
    for (var i = 0; i < line.length(); i++) {
      var c = line.charAt(i);
      if (c == '"') {
        if (quoted && i + 1 < line.length() && line.charAt(i + 1) == '"') {
          current.append('"');
          i++;
        } else {
          quoted = !quoted;
        }
      } else if (c == ',' && !quoted) {
        values.add(current.toString().trim());
        current.setLength(0);
      } else {
        current.append(c);
      }
    }
    values.add(current.toString().trim());
    return values;
  }

  private String sha256(byte[] bytes) {
    try {
      var digest = MessageDigest.getInstance("SHA-256").digest(bytes);
      var builder = new StringBuilder();
      for (byte b : digest) builder.append(String.format("%02x", b));
      return builder.toString();
    } catch (Exception error) {
      throw new IllegalStateException("SHA-256 is not available", error);
    }
  }

  private String value(Map<String, String> row, String key) {
    return clean(row.get(key));
  }

  private String clean(String value) {
    return value == null || value.isBlank() ? null : value.trim();
  }

  private boolean notBlank(String value) {
    return value != null && !value.isBlank();
  }

  private Double doubleValue(Map<String, String> row, String key) {
    try {
      var value = value(row, key);
      return value == null ? null : Double.valueOf(value);
    } catch (NumberFormatException error) {
      return null;
    }
  }

  private Integer intValue(Map<String, String> row, String key) {
    try {
      var value = value(row, key);
      return value == null ? null : Integer.valueOf(value);
    } catch (NumberFormatException error) {
      return null;
    }
  }
}

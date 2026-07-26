CREATE TABLE search_jobs (
  id UUID PRIMARY KEY,
  query VARCHAR(300) NOT NULL,
  location VARCHAR(300) NOT NULL,
  max_results INTEGER NOT NULL,
  status VARCHAR(40) NOT NULL,
  progress_percentage INTEGER NOT NULL,
  result_count INTEGER NOT NULL,
  duplicate_count INTEGER NOT NULL,
  failure_code VARCHAR(80),
  failure_message VARCHAR(1000),
  idempotency_key VARCHAR(200),
  created_at TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  version BIGINT NOT NULL
);

CREATE UNIQUE INDEX uq_search_jobs_idempotency_key
  ON search_jobs(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE TABLE search_job_status_history (
  id UUID PRIMARY KEY,
  search_job_id UUID NOT NULL REFERENCES search_jobs(id),
  status VARCHAR(40) NOT NULL,
  message VARCHAR(1000),
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE lead_import_batches (
  id UUID PRIMARY KEY,
  search_job_id UUID NOT NULL REFERENCES search_jobs(id),
  provider VARCHAR(80) NOT NULL,
  original_filename VARCHAR(300) NOT NULL,
  checksum VARCHAR(128) NOT NULL,
  declared_record_count INTEGER,
  accepted_rows INTEGER NOT NULL,
  rejected_rows INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT uq_import_batch_checksum UNIQUE (search_job_id, provider, checksum)
);

CREATE TABLE lead_search_results (
  id UUID PRIMARY KEY,
  search_job_id UUID NOT NULL REFERENCES search_jobs(id),
  business_id UUID NOT NULL,
  import_batch_id UUID NOT NULL REFERENCES lead_import_batches(id),
  provider VARCHAR(80) NOT NULL,
  source_external_id VARCHAR(300),
  business_name VARCHAR(300) NOT NULL,
  category VARCHAR(200),
  city VARCHAR(160),
  has_phone BOOLEAN NOT NULL,
  has_email BOOLEAN NOT NULL,
  has_website BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT uq_search_business_provider_source UNIQUE (search_job_id, provider, source_external_id),
  CONSTRAINT uq_search_business_once UNIQUE (search_job_id, business_id)
);

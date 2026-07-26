CREATE TABLE canonical_businesses (
  id UUID PRIMARY KEY,
  name VARCHAR(300) NOT NULL,
  normalized_name VARCHAR(300),
  website VARCHAR(500),
  normalized_website_domain VARCHAR(300),
  phone_number VARCHAR(80),
  normalized_phone_number VARCHAR(80),
  email VARCHAR(320),
  address VARCHAR(1000),
  normalized_address VARCHAR(1000),
  city VARCHAR(180),
  state VARCHAR(180),
  country VARCHAR(180),
  postal_code VARCHAR(40),
  category VARCHAR(200),
  source VARCHAR(80),
  source_ref VARCHAR(300),
  source_url VARCHAR(1000),
  rating DOUBLE PRECISION,
  review_count INTEGER,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  status VARCHAR(40) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ,
  created_by VARCHAR(120),
  updated_by VARCHAR(120),
  version BIGINT NOT NULL,
  CONSTRAINT uq_business_source_ref UNIQUE (source, source_ref)
);

CREATE INDEX idx_business_domain ON canonical_businesses(normalized_website_domain);
CREATE INDEX idx_business_phone ON canonical_businesses(normalized_phone_number);
CREATE INDEX idx_business_name_address ON canonical_businesses(normalized_name, normalized_address);

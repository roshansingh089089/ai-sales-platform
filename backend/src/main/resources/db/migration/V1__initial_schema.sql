CREATE TABLE businesses (
 id UUID PRIMARY KEY, name VARCHAR(200) NOT NULL, website VARCHAR(500), industry VARCHAR(120),
 city VARCHAR(120), state VARCHAR(120), country VARCHAR(120), description TEXT,
 source VARCHAR(30) NOT NULL CHECK (source IN ('MANUAL','CSV_IMPORT','AI_DISCOVERY')),
 status VARCHAR(30) NOT NULL CHECK (status IN ('NEW','RESEARCH_PENDING','RESEARCHED','CONTACT_READY','CONTACTED','QUALIFIED','NOT_INTERESTED','DO_NOT_CONTACT')),
 created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL, version BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX idx_businesses_status ON businesses(status);
CREATE INDEX idx_businesses_name_lower ON businesses(lower(name));

CREATE TABLE contacts (
 id UUID PRIMARY KEY, business_id UUID NOT NULL REFERENCES businesses(id), first_name VARCHAR(120) NOT NULL,
 last_name VARCHAR(120), designation VARCHAR(200), phone_number VARCHAR(20), email VARCHAR(320),
 preferred_contact_method VARCHAR(20) NOT NULL CHECK (preferred_contact_method IN ('PHONE','EMAIL','UNKNOWN')),
 do_not_contact BOOLEAN NOT NULL DEFAULT FALSE, notes TEXT, created_at TIMESTAMPTZ NOT NULL,
 updated_at TIMESTAMPTZ NOT NULL, version BIGINT NOT NULL DEFAULT 0,
 CONSTRAINT uq_contact_business_phone UNIQUE (business_id, phone_number)
);
CREATE INDEX idx_contacts_business ON contacts(business_id);

CREATE TABLE opportunities (
 id UUID PRIMARY KEY, business_id UUID NOT NULL REFERENCES businesses(id), title VARCHAR(255) NOT NULL,
 problem_statement TEXT NOT NULL, proposed_solution TEXT NOT NULL, confidence_score NUMERIC(3,2),
 evidence TEXT, status VARCHAR(20) NOT NULL CHECK (status IN ('DRAFT','VALIDATED','REJECTED')),
 created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL, version BIGINT NOT NULL DEFAULT 0,
 CHECK (confidence_score IS NULL OR confidence_score BETWEEN 0 AND 1)
);
CREATE INDEX idx_opportunities_business ON opportunities(business_id);

CREATE TABLE call_briefs (
 id UUID PRIMARY KEY, business_id UUID NOT NULL REFERENCES businesses(id), contact_id UUID NOT NULL REFERENCES contacts(id),
 opportunity_id UUID REFERENCES opportunities(id), objective TEXT NOT NULL, introduction TEXT NOT NULL,
 key_talking_points TEXT NOT NULL, discovery_questions TEXT NOT NULL, likely_objections TEXT NOT NULL,
 suggested_responses TEXT NOT NULL, next_best_action TEXT NOT NULL,
 status VARCHAR(20) NOT NULL CHECK (status IN ('DRAFT','READY','USED','ARCHIVED')),
 created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL, version BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX idx_call_briefs_contact ON call_briefs(contact_id);
CREATE INDEX idx_call_briefs_business ON call_briefs(business_id);

CREATE TABLE call_activities (
 id UUID PRIMARY KEY, business_id UUID NOT NULL REFERENCES businesses(id), contact_id UUID NOT NULL REFERENCES contacts(id),
 call_brief_id UUID REFERENCES call_briefs(id), started_at TIMESTAMPTZ, completed_at TIMESTAMPTZ,
 outcome VARCHAR(30) NOT NULL, summary TEXT, customer_interest VARCHAR(20) NOT NULL,
 follow_up_required BOOLEAN NOT NULL DEFAULT FALSE, follow_up_date TIMESTAMPTZ, notes TEXT,
 created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL, version BIGINT NOT NULL DEFAULT 0,
 CHECK (outcome IN ('CONNECTED','NO_ANSWER','BUSY','CALL_BACK_LATER','WRONG_NUMBER','NOT_INTERESTED','INTERESTED','MEETING_REQUESTED','DO_NOT_CONTACT')),
 CHECK (customer_interest IN ('UNKNOWN','LOW','MEDIUM','HIGH'))
);
CREATE INDEX idx_call_activities_business ON call_activities(business_id);

CREATE TABLE tasks (
 id UUID PRIMARY KEY, business_id UUID NOT NULL REFERENCES businesses(id), contact_id UUID REFERENCES contacts(id),
 call_activity_id UUID REFERENCES call_activities(id), title VARCHAR(255) NOT NULL, description TEXT,
 due_at TIMESTAMPTZ NOT NULL, priority VARCHAR(20) NOT NULL CHECK (priority IN ('LOW','MEDIUM','HIGH','URGENT')),
 status VARCHAR(20) NOT NULL CHECK (status IN ('OPEN','IN_PROGRESS','COMPLETED','CANCELLED')),
 created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL, version BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX idx_tasks_status_due ON tasks(status,due_at);

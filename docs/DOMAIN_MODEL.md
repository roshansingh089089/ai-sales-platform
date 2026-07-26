# Domain model

Businesses own contacts and opportunities. A call brief combines a business, contact, and optional opportunity. A manually recorded call activity references that context. Qualifying outcomes create tasks. UUIDs identify records; PostgreSQL `timestamptz` and Hibernate UTC settings preserve UTC; version columns provide optimistic locking.

Do-not-contact is preserved on the contact and business, and blocks future manual-call URI responses without deleting activity history.

-- Contact viewing is no longer gated or audited through a separate access-log table.
-- Requester contact details are returned by the authenticated agent search-request endpoint.
DROP TABLE IF EXISTS "contact_access_logs";

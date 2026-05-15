-- Demo tenant + default «Uke én» template (10 questions). Runs once per Flyway history.

INSERT INTO tenant (slug, name)
SELECT 'demo', 'Blend-In demo-tenant'
WHERE NOT EXISTS (SELECT 1 FROM tenant WHERE slug = 'demo');

INSERT INTO quiz_template (tenant_id, name)
SELECT t.id, 'Standard · Uke én'
FROM tenant t
WHERE t.slug = 'demo'
  AND NOT EXISTS (SELECT 1 FROM quiz_template q WHERE q.tenant_id = t.id);

INSERT INTO quiz_template_version (quiz_template_id, version_number, published_at)
SELECT qt.id, 1, now()
FROM quiz_template qt
JOIN tenant t ON qt.tenant_id = t.id
WHERE t.slug = 'demo'
  AND qt.name = 'Standard · Uke én'
  AND NOT EXISTS (SELECT 1 FROM quiz_template_version v WHERE v.quiz_template_id = qt.id);

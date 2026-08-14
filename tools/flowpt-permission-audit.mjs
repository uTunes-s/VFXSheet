#!/usr/bin/env node
/**
 * Read-only Flow Production Tracking API Script permission audit.
 *
 * Required, process-local environment variables:
 *   FLOWPT_SITE_URL
 *   FLOWPT_SCRIPT_NAME
 *   FLOWPT_SCRIPT_KEY
 *
 * This script never creates, edits, retires, uploads, or prints credentials.
 */

const requiredVariables = ['FLOWPT_SITE_URL', 'FLOWPT_SCRIPT_NAME', 'FLOWPT_SCRIPT_KEY'];
const missingVariables = requiredVariables.filter(name => !process.env[name]?.trim());
if (missingVariables.length) {
  console.error(`Missing required environment variable(s): ${missingVariables.join(', ')}`);
  process.exit(2);
}

function normalizeSiteUrl(value) {
  const url = new URL(value.trim());
  if (url.protocol !== 'https:') throw new Error('FLOWPT_SITE_URL must use HTTPS.');
  return url.origin;
}

function toSnakeCase(value) {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

function toPluralSnakeCase(value) {
  const singular = toSnakeCase(value);
  return singular.endsWith('s') ? singular : `${singular}s`;
}

const siteUrl = normalizeSiteUrl(process.env.FLOWPT_SITE_URL);
const scriptName = process.env.FLOWPT_SCRIPT_NAME.trim();
const scriptKey = process.env.FLOWPT_SCRIPT_KEY.trim();
const auditProjectId = process.env.FLOWPT_AUDIT_PROJECT_ID?.trim();

if (auditProjectId && !/^\d+$/.test(auditProjectId)) {
  throw new Error('FLOWPT_AUDIT_PROJECT_ID must be a numeric Project ID.');
}

function summarizeError(body) {
  const error = body?.errors?.[0] || body?.error;
  return error?.title || error?.detail || body?.message || 'No error detail returned';
}

async function request(path, { token, method = 'GET', headers = {}, body } = {}) {
  const response = await fetch(`${siteUrl}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
    },
    body
  });

  let responseBody = null;
  try {
    responseBody = await response.json();
  } catch {
    // A successful endpoint may have an empty body.
  }

  return {
    ok: response.ok,
    status: response.status,
    body: responseBody,
    detail: response.ok ? 'Allowed' : summarizeError(responseBody)
  };
}

function resultRow(test, result, purpose) {
  return {
    test,
    purpose,
    result: result.ok ? 'ALLOWED' : 'DENIED / ERROR',
    http: result.status,
    detail: result.detail
  };
}

function recordCount(body) {
  return Array.isArray(body?.data) ? body.data.length : 0;
}

async function main() {
  console.log(`Auditing Flow Production Tracking permissions for Script "${scriptName}" on ${siteUrl}`);
  console.log('Mode: read-only. No records, files, schema, or permissions will be changed.\n');

  const authResponse = await fetch(`${siteUrl}/api/v1.1/auth/access_token`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      client_id: scriptName,
      client_secret: scriptKey,
      grant_type: 'client_credentials'
    })
  });

  let authBody = null;
  try {
    authBody = await authResponse.json();
  } catch {
    // Handled below as an authentication failure.
  }

  if (!authResponse.ok || !authBody?.access_token) {
    console.table([{
      test: 'Authenticate',
      purpose: 'Validate API Script Name and Script Key',
      result: 'DENIED / ERROR',
      http: authResponse.status,
      detail: summarizeError(authBody)
    }]);
    process.exit(1);
  }

  const token = authBody.access_token;
  const results = [{
    test: 'Authenticate',
    purpose: 'Validate API Script Name and Script Key',
    result: 'ALLOWED',
    http: authResponse.status,
    detail: `Access token issued (expires in ${authBody.expires_in ?? 'unknown'} seconds)`
  }];

  const schema = await request('/api/v1.1/schema', { token });
  results.push(resultRow('Read schema', schema, 'Discover visible entity types and identify Shooting Data'));

  const projects = await request('/api/v1.1/entity/projects?page[size]=500&fields=name,code', { token });
  results.push(resultRow('Read Project', projects, 'Verify the Project records accessible to this Script'));

  if (projects.ok && Array.isArray(projects.body?.data)) {
    console.log('\nProject records returned to this Script (first page, maximum 500):');
    console.table(projects.body.data.map(project => ({
      id: project?.id,
      name: project?.attributes?.name ?? project?.name,
      code: project?.attributes?.code ?? project?.code
    })));
  }

  if (auditProjectId) {
    const projectScopedEntities = [
      ['Asset', 'assets'],
      ['Sequence', 'sequences'],
      ['Shot', 'shots'],
      ['Task', 'tasks'],
      ['Version', 'versions'],
      ['Note', 'notes'],
      ['Element', 'elements'],
      ['Published File', 'published_files'],
      ['Shooting Data', 'custom_entity01s']
    ];

    console.log(`\nProject-scoped data audit for Project ID ${auditProjectId} (one record maximum per entity; values are not printed):`);
    for (const [displayName, endpoint] of projectScopedEntities) {
      const query = new URLSearchParams({
        'filter[project.Project.id]': auditProjectId,
        'page[size]': '1',
        fields: 'project'
      });
      const entityRecords = await request(`/api/v1.1/entity/${endpoint}?${query}`, { token });
      const row = resultRow(
        `Read ${displayName} in audit Project`,
        entityRecords,
        `Verify whether ${displayName} records in Project ID ${auditProjectId} are readable`
      );
      if (entityRecords.ok) {
        row.detail = `Allowed; ${recordCount(entityRecords.body)} matching record(s) returned (values suppressed)`;
      }
      results.push(row);
    }
  }

  if (schema.ok && schema.body?.data) {
    const schemaEntities = Object.entries(schema.body.data)
      .map(([entity, definition]) => ({
        entity,
        displayName: definition?.name?.value,
        visible: definition?.visible?.value
      }));

    console.log('\nEntity schemas returned to this Script:');
    console.table(schemaEntities);

    const candidates = schemaEntities
      .filter(({ displayName }) => /shooting\s*data/i.test(String(displayName || '')))
      .map(({ entity, displayName, visible }) => ({ entity, displayName, visible }));

    if (candidates.length) {
      console.log('\nShooting Data candidates visible to this Script:');
      console.table(candidates);
      for (const candidate of candidates) {
        const fields = await request(`/api/v1.1/schema/${encodeURIComponent(toSnakeCase(candidate.entity))}/fields`, { token });
        results.push(resultRow(
          `Read ${candidate.displayName} schema`,
          fields,
          'Confirm exact field codes and visibility before implementing mapping'
        ));
        if (fields.ok && fields.body?.data) {
          console.log(`\n${candidate.displayName} fields visible to this Script:`);
          console.table(Object.entries(fields.body.data).map(([field, definition]) => ({
            field,
            displayName: definition?.name?.value,
            dataType: definition?.data_type?.value,
            mandatory: definition?.mandatory?.value,
            editable: definition?.editable?.value,
            visible: definition?.visible?.value
          })));
        }
        const records = await request(`/api/v1.1/entity/${encodeURIComponent(toPluralSnakeCase(candidate.entity))}?page[size]=1`, { token });
        results.push(resultRow(
          `Read ${candidate.displayName} records`,
          records,
          'Verify actual entity read permission; this request does not modify records'
        ));
      }
    } else {
      results.push({
        test: 'Find Shooting Data entity',
        purpose: 'Identify target entity from visible schema',
        result: 'NOT FOUND',
        http: schema.status,
        detail: 'No visible entity display name matched "Shooting Data".'
      });
    }
  }

  console.log('\nPermission audit results:');
  console.table(results);

  const granted = results.filter(row => row.result === 'ALLOWED').map(row => row.test);
  const denied = results.filter(row => row.result === 'DENIED / ERROR').map(row => row.test);
  console.log(`\nAllowed: ${granted.join(', ') || 'none'}`);
  console.log(`Denied/error: ${denied.join(', ') || 'none'}`);
  console.log('\nInterpretation: an all-disabled test role should authenticate but deny protected reads. Enable only the next required read permission, rerun, and retain the result as the permission audit record.');
}

main().catch(error => {
  console.error(`Audit failed: ${error.message}`);
  process.exit(1);
});

// Local Flow Production Tracking REST API connection settings.
import { db } from './database.js';

const SETTINGS_TYPE = 'flowpt_connection';
let connectionTestSucceeded = false;

function setFlowPtUiState(enabled, tested = connectionTestSucceeded) {
  const settings = document.getElementById('flowPtConnectionSettings');
  const toggle = document.getElementById('flowPtEnabled');
  const syncButton = document.getElementById('syncBtn');
  if (toggle) toggle.checked = enabled;
  if (settings) settings.classList.toggle('hidden', !enabled);
  if (syncButton) syncButton.classList.toggle('hidden', !(enabled && tested));
}

function normalizeSiteUrl(value) {
  const url = new URL(String(value || '').trim());
  if (url.protocol !== 'https:') throw new Error('Flow Production Tracking site URL must use HTTPS.');
  return url.origin;
}

export async function getFlowPtConnection() {
  return (await db.presets.get(SETTINGS_TYPE))?.values || {};
}

export async function saveFlowPtConnectionFromForm() {
  const siteUrl = normalizeSiteUrl(document.getElementById('flowPtSiteUrl').value);
  const scriptName = document.getElementById('flowPtScriptName').value.trim();
  const scriptKey = document.getElementById('flowPtScriptKey').value.trim();
  const existing = await getFlowPtConnection();
  const selectedProject = getSelectedProject();
  if (!scriptName || !scriptKey) throw new Error('API Script Name and Script Key are required.');

  await db.presets.put({
    type: SETTINGS_TYPE,
    values: { ...existing, enabled: existing.enabled === true, siteUrl, scriptName, scriptKey, targetProject: selectedProject || existing.targetProject }
  });
  document.getElementById('flowPtSiteUrl').value = siteUrl;
  document.getElementById('flowPtScriptKey').value = '';
  updateFlowPtConnectionStatus({ siteUrl, scriptName, scriptKey, targetProject: selectedProject || existing.targetProject });
}

export async function populateFlowPtConnectionForm() {
  const connection = await getFlowPtConnection();
  connectionTestSucceeded = false;
  setFlowPtUiState(connection.enabled === true, false);
  document.getElementById('flowPtSiteUrl').value = connection.siteUrl || '';
  document.getElementById('flowPtScriptName').value = connection.scriptName || '';
  document.getElementById('flowPtScriptKey').value = '';
  populateFlowPtProjectSelect([], connection.targetProject);
  updateFlowPtConnectionStatus(connection);
}

export async function setFlowPtEnabled(enabled) {
  const connection = await getFlowPtConnection();
  connectionTestSucceeded = false;
  await db.presets.put({ type: SETTINGS_TYPE, values: { ...connection, enabled } });
  setFlowPtUiState(enabled, false);
  updateFlowPtConnectionStatus({ ...connection, enabled });
}

export function markFlowPtConnectionTestSucceeded() {
  connectionTestSucceeded = true;
  setFlowPtUiState(document.getElementById('flowPtEnabled')?.checked === true, true);
}

export function updateFlowPtConnectionStatus(connection) {
  const status = document.getElementById('flowPtConnectionStatus');
  if (!connection.enabled) {
    status.textContent = 'Flow Production Tracking synchronization is off.';
    return;
  }
  if (!connection.siteUrl || !connection.scriptName || !connection.scriptKey) {
    status.textContent = 'Not configured. The Script Key is stored only on this device and is excluded from configuration exports.';
    return;
  }
  const target = connection.targetProject;
  status.textContent = target?.id
    ? `Configured for ${connection.siteUrl} as ${connection.scriptName}. Sync target: ${target.name || `Project ${target.id}`} (ID ${target.id}). The saved Script Key is hidden.`
    : `Configured for ${connection.siteUrl} as ${connection.scriptName}. Test the connection and select a sync target Project. The saved Script Key is hidden.`;
}

export async function testFlowPtConnection() {
  const connection = await getFlowPtConnection();
  if (!connection.siteUrl || !connection.scriptName || !connection.scriptKey) {
    throw new Error('Save the Flow Production Tracking connection settings first.');
  }

  const response = await fetch(`${connection.siteUrl}/api/v1.1/auth/access_token`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      client_id: connection.scriptName,
      client_secret: connection.scriptKey,
      grant_type: 'client_credentials'
    })
  });
  if (!response.ok) throw new Error(`Authentication failed (HTTP ${response.status}). Check the site URL and API Script credentials.`);

  const token = await response.json();
  if (!token.access_token) throw new Error('Flow Production Tracking did not return an access token.');
  return token;
}

function projectName(project) {
  return project?.attributes?.name || project?.name || `Project ${project?.id}`;
}

function getSelectedProject() {
  const select = document.getElementById('flowPtProjectId');
  const option = select?.selectedOptions?.[0];
  const id = Number(option?.value);
  return Number.isInteger(id) && id > 0 ? {
    id,
    name: option.dataset.projectName || option.textContent.trim(),
    isTemplate: option.dataset.isTemplate === 'true'
  } : null;
}

export function populateFlowPtProjectSelect(projects, selectedProject) {
  const select = document.getElementById('flowPtProjectId');
  const selectedId = Number(selectedProject?.id);
  const knownProjects = projects.filter(project => project?.attributes?.is_template !== true);
  if (selectedId && !selectedProject?.isTemplate && !knownProjects.some(project => Number(project.id) === selectedId)) {
    knownProjects.push({ id: selectedId, attributes: { name: selectedProject.name || `Project ${selectedId}` } });
  }
  knownProjects.sort((left, right) => projectName(left).localeCompare(projectName(right)));
  select.replaceChildren(new Option('Select a Project', ''));
  for (const project of knownProjects) {
    const name = projectName(project);
    const option = new Option(`${name} (ID ${project.id})`, String(project.id));
    option.dataset.projectName = name;
    option.dataset.isTemplate = String(project?.attributes?.is_template === true);
    option.selected = Number(project.id) === selectedId;
    select.add(option);
  }
  select.disabled = knownProjects.length === 0;
}

export async function loadFlowPtProjects() {
  const connection = await getFlowPtConnection();
  const token = await testFlowPtConnection();
  const response = await fetch(`${connection.siteUrl}/api/v1.1/entity/projects?page[size]=500&fields=name,is_template`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token.access_token}` }
  });
  let body = null;
  try {
    body = await response.json();
  } catch {
    // The error below reports an HTTP status when Flow PT has no JSON error body.
  }
  if (!response.ok) throw new Error(`Project list failed (HTTP ${response.status}).`);
  const projects = Array.isArray(body?.data) ? body.data : [];
  const nonTemplateProjects = projects.filter(project => project?.attributes?.is_template !== true);
  const selectedProject = projects.find(project => Number(project.id) === Number(connection.targetProject?.id));
  const savedTarget = selectedProject?.attributes?.is_template === true
    ? { ...connection.targetProject, isTemplate: true }
    : connection.targetProject;
  populateFlowPtProjectSelect(nonTemplateProjects, savedTarget);
  return { token, projects: nonTemplateProjects };
}

export async function saveSelectedFlowPtProject() {
  const connection = await getFlowPtConnection();
  const targetProject = getSelectedProject();
  if (!connection.siteUrl || !connection.scriptName || !connection.scriptKey) {
    throw new Error('Save the Flow Production Tracking connection settings first.');
  }
  if (!targetProject) throw new Error('Select a sync target Project.');
  await db.presets.put({ type: SETTINGS_TYPE, values: { ...connection, targetProject } });
  updateFlowPtConnectionStatus({ ...connection, targetProject });
  return targetProject;
}
// Controls used while configuring the fields applied to new VFX Sheets.
function showInitialSettingToggles(enabled) {
  const form = document.getElementById('vfxForm');
  form.classList.add('configuring-initial-settings');
  form.querySelectorAll('.initial-setting-control').forEach(control => control.remove());
  form.querySelectorAll('[data-initial-setting]').forEach(element => {
    const key = element.dataset.initialSetting;
    const control = document.createElement('span');
    control.className = 'initial-setting-control mr-1.5 cursor-pointer align-middle';
    control.title = 'ON: Apply to new sheets / OFF: Leave blank or use application defaults';
    control.innerHTML = `<input id="initialSetting_${key}" type="checkbox" class="peer sr-only" ${enabled[key] ? 'checked' : ''}><span class="relative h-4 w-8 rounded-md border border-rose-300/50 bg-slate-800 transition peer-checked:border-rose-200 peer-checked:bg-rose-600 after:absolute after:left-0.5 after:top-0.5 after:h-2.5 after:w-2.5 after:rounded-sm after:bg-slate-300 after:shadow-sm after:transition-transform peer-checked:after:translate-x-4 peer-checked:after:bg-white"></span>`;
    control.dataset.action = 'toggle-initial-setting';
    control.dataset.initialSetting = key;
    element.prepend(control);
    const field = element.parentElement?.querySelector('input:not([id^="initialSetting_"]), textarea, select');
    if (field) {
      field.addEventListener('input', () => markInitialSettingEnabled(key));
      field.addEventListener('change', () => markInitialSettingEnabled(key));
    }
  });
}

function getVisibleInitialSettingStates() {
  const states = { ...initialSettingToggleStates };
  document.querySelectorAll('[id^="initialSetting_"]').forEach(input => {
    states[input.id.replace('initialSetting_', '')] = input.checked;
  });
  initialSettingToggleStates = states;
  return states;
}

function markInitialSettingEnabled(key) {
  if (!isConfiguringAddDefaults) return;
  const toggle = document.getElementById(`initialSetting_${key}`);
  if (toggle) toggle.checked = true;
  initialSettingToggleStates[key] = true;
}

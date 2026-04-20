import { html, reactive } from '@xdadda/mini'
import section from './_section.js'
import { debounce } from '../utils/tools.js'

const DEFAULTS = { amount: 0, size: 0.25, rough: 0.5 }

export default function grain($selection, _params, onUpdate) {
  const params = _params.grain

  reactive(
    () => {
      if ($selection.value === null) updateResetBtn()
    },
    { effect: true },
  )

  function isDefault() {
    for (const k of Object.keys(DEFAULTS)) if (params[k] !== DEFAULTS[k]) return false
    return true
  }
  function updateResetBtn() {
    const el = document.getElementById('btn_reset_grain')
    if (!el) return
    if (isDefault()) el.setAttribute('disabled', true)
    else el.removeAttribute('disabled')
  }
  function resetSection() {
    for (const k of Object.keys(DEFAULTS)) {
      params[k] = DEFAULTS[k]
      const rng = document.getElementById('grain_' + k)
      const num = document.getElementById('grain_' + k + '_')
      if (rng) rng.value = DEFAULTS[k]
      if (num) num.value = DEFAULTS[k]
    }
    onUpdate()
    updateResetBtn()
  }

  function _setParam(e) {
    debounce('grain', () => setParam.call(this, e), 30)
  }
  function setParam(e) {
    const id = this.id.split('_')
    params[id[1]] = parseFloat(e.target.value)
    const rng = document.getElementById('grain_' + id[1])
    const num = document.getElementById('grain_' + id[1] + '_')
    if (rng) rng.value = params[id[1]]
    if (num) num.value = params[id[1]]
    onUpdate()
    updateResetBtn()
  }
  function resetParamCtrl() {
    const id = this.id.split('_')
    params[id[1]] = DEFAULTS[id[1]]
    const rng = document.getElementById('grain_' + id[1])
    const num = document.getElementById('grain_' + id[1] + '_')
    if (rng) rng.value = params[id[1]]
    if (num) num.value = params[id[1]]
    onUpdate()
    updateResetBtn()
  }

  return html`
    ${section(
      'grain',
      null,
      $selection,
      _params,
      onUpdate,
      resetSection,
      () => html`
        ${['amount', 'size', 'rough'].map(
          (k) => html`
            <div
              style="display:flex;justify-content: space-around;align-items:center;"
            >
              <div class="rangelabel">${k}</div>
              <input
                id="${'grain_' + k}"
                type="range"
                style="width:130px;"
                value="${params[k]}"
                min="0"
                max="1"
                step="0.01"
                @input="${_setParam}"
                @dblclick="${resetParamCtrl}"
              />
              <input
                id="${'grain_' + k + '_'}"
                type="number"
                class="rangenumb"
                value="${params[k]}"
                min="0"
                max="1"
                step="0.01"
                @input="${_setParam}"
              />
            </div>
          `,
        )}
      `,
    )}
  `
}

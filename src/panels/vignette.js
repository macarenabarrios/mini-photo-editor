import { html, reactive } from '@xdadda/mini'
import section from './_section.js'
import { debounce } from '../utils/tools.js'

const DEFAULTS = {
  amount: 0,
  midpoint: 0.5,
  feather: 0.5,
  roundness: 0,
  style: 0,
}
const RANGES = {
  amount: { min: -1, max: 1, step: 0.01 },
  midpoint: { min: 0, max: 1, step: 0.01 },
  feather: { min: 0, max: 1, step: 0.01 },
  roundness: { min: -1, max: 1, step: 0.01 },
  style: { min: 0, max: 2, step: 1 },
}
const STYLE_LABELS = ['highlight', 'color', 'paint']

export default function vignette($selection, _params, onUpdate) {
  const params = _params.vignette

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
    const el = document.getElementById('btn_reset_vignette')
    if (!el) return
    if (isDefault()) el.setAttribute('disabled', true)
    else el.removeAttribute('disabled')
  }
  function resetSection() {
    for (const k of Object.keys(DEFAULTS)) {
      params[k] = DEFAULTS[k]
      const rng = document.getElementById('vignette_' + k)
      const num = document.getElementById('vignette_' + k + '_')
      if (rng) rng.value = DEFAULTS[k]
      if (num) num.value = DEFAULTS[k]
    }
    refreshStyleLabel()
    onUpdate()
    updateResetBtn()
  }

  function _setParam(e) {
    debounce('vignette', () => setParam.call(this, e), 30)
  }
  function setParam(e) {
    const id = this.id.split('_')
    params[id[1]] = parseFloat(e.target.value)
    const rng = document.getElementById('vignette_' + id[1])
    const num = document.getElementById('vignette_' + id[1] + '_')
    if (rng) rng.value = params[id[1]]
    if (num) num.value = params[id[1]]
    if (id[1] === 'style') refreshStyleLabel()
    onUpdate()
    updateResetBtn()
  }
  function resetParamCtrl() {
    const id = this.id.split('_')
    params[id[1]] = DEFAULTS[id[1]]
    const rng = document.getElementById('vignette_' + id[1])
    const num = document.getElementById('vignette_' + id[1] + '_')
    if (rng) rng.value = params[id[1]]
    if (num) num.value = params[id[1]]
    if (id[1] === 'style') refreshStyleLabel()
    onUpdate()
    updateResetBtn()
  }

  function refreshStyleLabel() {
    const el = document.getElementById('vignette_stylename')
    if (el) el.textContent = STYLE_LABELS[params.style | 0] || ''
  }

  return html`
    ${section(
      'vignette',
      null,
      $selection,
      _params,
      onUpdate,
      resetSection,
      () => html`
        ${Object.keys(DEFAULTS).map((k) => {
          const r = RANGES[k]
          return html`
            <div
              style="display:flex;justify-content: space-around;align-items:center;"
            >
              <div class="rangelabel">${k}</div>
              <input
                id="${'vignette_' + k}"
                type="range"
                style="width:130px;"
                value="${params[k]}"
                min="${r.min}"
                max="${r.max}"
                step="${r.step}"
                @input="${_setParam}"
                @dblclick="${resetParamCtrl}"
              />
              <input
                id="${'vignette_' + k + '_'}"
                type="number"
                class="rangenumb"
                value="${params[k]}"
                min="${r.min}"
                max="${r.max}"
                step="${r.step}"
                @input="${_setParam}"
              />
            </div>
          `
        })}
        <div
          style="text-align:center;color:gray;font-size:11px;margin-top:2px;"
        >
          style: <i id="vignette_stylename">${STYLE_LABELS[params.style | 0]}</i>
        </div>
      `,
    )}
  `
}

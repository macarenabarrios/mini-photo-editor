import { html, reactive } from '@xdadda/mini'
import section from './_section.js'
import { debounce } from '../utils/tools.js'

const COLORS = ['red', 'orange', 'yellow', 'green', 'aqua', 'blue', 'purple', 'magenta']
const CHANNELS = [
  { key: 'h', label: 'hue' },
  { key: 's', label: 'sat' },
  { key: 'l', label: 'lum' },
]
const SWATCH = {
  red: '#e23',
  orange: '#f80',
  yellow: '#dd0',
  green: '#2c5',
  aqua: '#0ce',
  blue: '#36f',
  purple: '#93f',
  magenta: '#e3c',
}

export default function hsl($selection, _params, onUpdate) {
  const params = _params.hsl
  let activeColor = 'red'

  reactive(
    () => {
      if ($selection.value === null) updateResetBtn()
    },
    { effect: true },
  )

  function isZero() {
    for (const c of COLORS)
      for (const ch of CHANNELS) if (params[c][ch.key]) return false
    return true
  }
  function updateResetBtn() {
    const el = document.getElementById('btn_reset_hsl')
    if (!el) return
    if (isZero()) el.setAttribute('disabled', true)
    else el.removeAttribute('disabled')
  }
  function resetSection() {
    for (const c of COLORS) for (const ch of CHANNELS) params[c][ch.key] = 0
    refreshInputs()
    refreshSwatches()
    onUpdate()
    updateResetBtn()
  }
  function refreshInputs() {
    for (const ch of CHANNELS) {
      const rng = document.getElementById('hsl_' + ch.key)
      const num = document.getElementById('hsl_' + ch.key + '_')
      if (rng) rng.value = params[activeColor][ch.key]
      if (num) num.value = params[activeColor][ch.key]
    }
  }
  function refreshSwatches() {
    for (const c of COLORS) {
      const el = document.getElementById('hsl_sw_' + c)
      if (!el) continue
      if (c === activeColor) el.setAttribute('selected', 'selected')
      else el.removeAttribute('selected')
      const v = params[c]
      if (v.h || v.s || v.l) el.setAttribute('modified', 'modified')
      else el.removeAttribute('modified')
    }
  }

  function _setParam(e) {
    debounce('hsl', () => setParam.call(this, e), 30)
  }
  function setParam(e) {
    const parts = this.id.split('_')
    const key = parts[1]
    params[activeColor][key] = parseFloat(e.target.value)
    const rng = document.getElementById('hsl_' + key)
    const num = document.getElementById('hsl_' + key + '_')
    if (rng) rng.value = params[activeColor][key]
    if (num) num.value = params[activeColor][key]
    refreshSwatches()
    onUpdate()
    updateResetBtn()
  }
  function resetParamCtrl() {
    const parts = this.id.split('_')
    const key = parts[1]
    params[activeColor][key] = 0
    const rng = document.getElementById('hsl_' + key)
    const num = document.getElementById('hsl_' + key + '_')
    if (rng) rng.value = 0
    if (num) num.value = 0
    refreshSwatches()
    onUpdate()
    updateResetBtn()
  }

  function pickColor(c) {
    activeColor = c
    refreshInputs()
    refreshSwatches()
  }

  return html`
    <style>
      .hsl_swatches {
        display: flex;
        justify-content: center;
        gap: 4px;
        margin: 4px 0 8px 0;
      }
      .hsl_sw {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        cursor: pointer;
        border: 2px solid transparent;
        box-sizing: border-box;
      }
      .hsl_sw[selected] {
        border-color: #fff;
        outline: 1px solid #000;
      }
      .hsl_sw[modified]::after {
        content: '•';
        display: block;
        color: #fff;
        text-align: center;
        margin-top: -4px;
        font-size: 14px;
        text-shadow: 0 0 2px #000;
      }
    </style>
    ${section(
      'hsl',
      null,
      $selection,
      _params,
      onUpdate,
      resetSection,
      () => html`
        <div class="hsl_swatches">
          ${COLORS.map(
            (c) => html`
              <div
                id="${'hsl_sw_' + c}"
                class="hsl_sw"
                style="${'background:' + SWATCH[c]}"
                title="${c}"
                @click="${() => pickColor(c)}"
              ></div>
            `,
          )}
        </div>
        ${CHANNELS.map(
          (ch) => html`
            <div
              style="display:flex;justify-content: space-around;align-items:center;"
            >
              <div class="rangelabel">${ch.label}</div>
              <input
                id="${'hsl_' + ch.key}"
                type="range"
                style="width:130px;"
                value="${params[activeColor][ch.key]}"
                min="-1"
                max="1"
                step="0.01"
                @input="${_setParam}"
                @dblclick="${resetParamCtrl}"
              />
              <input
                id="${'hsl_' + ch.key + '_'}"
                type="number"
                class="rangenumb"
                value="${params[activeColor][ch.key]}"
                min="-1"
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

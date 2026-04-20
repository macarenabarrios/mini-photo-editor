import { html, reactive } from '@xdadda/mini'
import section from './__section.js'
import { parseCubeFile } from './vendor/mini-gl/minigl.js'

/**
 * Custom .cube LUT loader.
 *
 * UI: a file input to upload a .cube, a list of loaded LUTs (click to activate,
 * click again to deselect), a mix slider, and the section reset button.
 *
 * State:
 *   params.customluts = { $skip, active, mix }
 *     - active: string id of the LUT currently applied (or 0 when none)
 *     - mix:    0..1 blend
 *   params._lutStore: Map<id, { id, name, size, data }>   (non-reactive, holds parsed cubes)
 */
export default function customluts($selection, _params, onUpdate) {
  const params = _params.customluts
  // Shared store lives on the top-level params so the pipeline in app.js can read it
  _params._lutStore = _params._lutStore || new Map()
  const store = _params._lutStore

  const $list = reactive([...store.keys()])
  const $error = reactive('')

  function refreshList() { $list.value = [...store.keys()] }

  async function onFileChange(e) {
    const files = [...(e.target.files || [])]
    e.target.value = '' // allow re-selecting same file later
    for (const file of files) {
      try {
        const text = await file.text()
        const parsed = parseCubeFile(text)
        const id = file.name + ':' + parsed.size + ':' + file.size
        store.set(id, { id, name: parsed.title || file.name, ...parsed })
        params.active = id
        params.mix = params.mix || 1
        $error.value = ''
      } catch (err) {
        console.error(err)
        $error.value = err.message
      }
    }
    refreshList()
    updateResetBtn()
    onUpdate()
  }

  function selectLUT(id) {
    if (params.active === id) {
      params.active = 0
    } else {
      params.active = id
      if (!params.mix) params.mix = 1
    }
    updateResetBtn()
    onUpdate()
  }

  function removeLUT(id, e) {
    e.stopPropagation()
    // Dispose GPU texture if the minigl instance is around
    const mini = _params._minigl
    if (mini?.disposeLUT3D) mini.disposeLUT3D(id)
    store.delete(id)
    if (params.active === id) params.active = 0
    refreshList()
    updateResetBtn()
    onUpdate()
  }

  function setMix(e) {
    params.mix = parseFloat(e.target.value)
    const num = document.getElementById('customluts_mix_')
    if (num) num.value = params.mix
    onUpdate()
  }
  function setMixNum(e) {
    params.mix = parseFloat(e.target.value)
    const rng = document.getElementById('customluts_mix')
    if (rng) rng.value = params.mix
    onUpdate()
  }

  function resetSection() {
    params.active = 0
    params.mix = 1
    updateResetBtn()
    onUpdate()
  }

  function updateResetBtn() {
    const el = document.getElementById('btn_reset_customluts')
    if (!el) return
    if (!params.active) el.setAttribute('disabled', true)
    else el.removeAttribute('disabled')
  }

  reactive(() => {
    if ($selection.value === null) updateResetBtn()
  }, { effect: true })

  return html`
    <style>
      .lutrow { display:flex; align-items:center; gap:6px; padding:3px 4px; border-radius:4px; cursor:pointer; }
      .lutrow[selected] { background: rgba(255,165,0,.2); }
      .lutrow .name { flex:1; font-size:12px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .lutrow .rm { opacity:.6; cursor:pointer; padding:0 4px; }
      .lutrow .rm:hover { opacity:1; color:#f55; }
      .lut_err { color:#f55; font-size:11px; margin:4px 0; }
    </style>

    ${section(
      'customluts',
      220,
      $selection,
      _params,
      onUpdate,
      resetSection,
      () => html`
        <div style="display:flex;justify-content:space-around;align-items:center;">
          <label style="cursor:pointer;font-size:12px;padding:4px 8px;border:1px solid #888;border-radius:4px;">
            + Load .cube
            <input type="file" accept=".cube" multiple style="display:none;" @change="${onFileChange}">
          </label>
        </div>

        ${() => $error.value && html`<div class="lut_err">${$error.value}</div>`}

        <div style="max-height:90px;overflow-y:auto;margin-top:6px;">
          ${() => $list.value.map(id => {
            const item = store.get(id)
            if (!item) return ''
            return html`
              <div class="lutrow" :selected="${() => params.active === id}" @click="${() => selectLUT(id)}">
                <span class="name" title="${item.name}">${item.name} (${item.size}³)</span>
                <span class="rm" @click="${(e) => removeLUT(id, e)}" title="remove">✕</span>
              </div>
            `
          })}
        </div>

        <div style="display:flex;justify-content:space-around;align-items:center;margin-top:6px;">
          <div class="rangelabel">mix</div>
          <input id="customluts_mix"  type="range"  style="width:130px;" value="${params.mix || 1}" min=0 max=1 step=0.01 @input="${setMix}">
          <input id="customluts_mix_" type="number" class="rangenumb"    value="${params.mix || 1}" min=0 max=1 step=0.01 @input="${setMixNum}">
        </div>
      `
    )}
  `
}

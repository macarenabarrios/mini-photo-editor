import { html, reactive } from '@xdadda/mini'
import { confirm } from '@xdadda/mini/components'
import section from './_section.js'
import { openFile, downloadFile } from '../utils/tools.js'
import { parseCubeFile } from '../vendor/mini-gl/minigl.js'

const RECIPE_VERSION = 1

// Sections whose full value object is serialized verbatim (non-zero / non-default values)
const DEFAULTS = {
  lights: {
    brightness: 0, exposure: 0, gamma: 0, contrast: 0,
    shadows: 0, highlights: 0, whites: 0, blacks: 0, bloom: 0,
  },
  colors: { temperature: 0, tint: 0, vibrance: 0, saturation: 0, sepia: 0 },
  effects: { clarity: 0, texture: 0, sharpen: 0, noise: 0, dehaze: 0 },
  grain: { amount: 0, size: 0.25, rough: 0.5 },
  vignette: {
    amount: 0, midpoint: 0.5, feather: 0.5, roundness: 0, style: 0,
  },
}

function diffFromDefault(section, defaults) {
  const out = {}
  for (const k of Object.keys(defaults)) {
    if (section[k] !== defaults[k]) out[k] = section[k]
  }
  return out
}

function hslSnapshot(hsl) {
  const out = {}
  for (const c of Object.keys(hsl)) {
    const v = hsl[c]
    if (v.h || v.s || v.l) out[c] = { h: v.h || 0, s: v.s || 0, l: v.l || 0 }
  }
  return out
}

export default function recipes($selection, params, onUpdate) {
  let save_btn_disabled = true

  reactive(
    () => {
      if ($selection.value === 'recipes') {
        const recipe = buildRecipe()
        save_btn_disabled = !hasContent(recipe)
      }
    },
    { effect: true },
  )

  function hasContent(r) {
    const keys = Object.keys(r).filter((k) => k !== 'version')
    return keys.length > 0
  }

  function buildRecipe() {
    const recipe = { version: RECIPE_VERSION }

    for (const sec of Object.keys(DEFAULTS)) {
      const diff = diffFromDefault(params[sec], DEFAULTS[sec])
      if (Object.keys(diff).length) recipe[sec] = diff
    }

    // HSL: nested per-color
    if (params.hsl) {
      const snap = hslSnapshot(params.hsl)
      if (Object.keys(snap).length) recipe.hsl = snap
    }

    // Curves: serialize points array (4 channels, each null or [[x,y],...])
    if (params.curve?.curvepoints) {
      recipe.curve = { curvepoints: params.curve.curvepoints }
    }

    // Instagram preset filter (mini-gl's filterInsta takes opt + mix)
    if (params.filters?.opt) {
      const label =
        typeof params.filters.opt === 'string'
          ? params.filters.opt
          : params.filters.opt?.label
      if (label) recipe.filters = { label, mix: params.filters.mix ?? 1 }
    }

    // Blur
    if (params.blur?.bokehstrength || params.blur?.gaussianstrength) {
      recipe.blur = { ...params.blur }
      delete recipe.blur.$skip
    }

    // Custom LUT — embed either a reference (by filename) or the full .cube text
    if (params.customluts?.active && params._lutStore) {
      const lut = params._lutStore.get(params.customluts.active)
      if (lut) {
        recipe.customLUT = {
          name: lut.filename || lut.name,
          size: lut.size,
          mix: params.customluts.mix ?? 1,
        }
        if (lut.cubeText) recipe.customLUT.text = lut.cubeText
      }
    }

    return recipe
  }

  async function saveRecipe() {
    const recipe = buildRecipe()
    if (!hasContent(recipe)) return

    const newfilename = reactive(
      'recipe_' + new Date().toISOString().split('T')[0] + '.json',
    )

    const resp = await confirm(
      () =>
        html` <div style="margin:10px 0">
          <div style="height:38px;">Download recipe</div>
          <div style="display:flex;flex-direction:column;font-size:14px;">
            <div>
              <input
                style="width:225px;font-size:14px;"
                type="text"
                :value="${() => newfilename.value}"
                @change="${(e) => (newfilename.value = e.target.value)}"
              />
            </div>
            ${recipe.customLUT?.text
              ? html`<div style="margin-top:6px;color:gray;font-size:11px;">
                  includes embedded LUT (${recipe.customLUT.name},
                  ${Math.round(recipe.customLUT.text.length / 1024)} KB)
                </div>`
              : ''}
          </div>
        </div>`,
    )
    if (!resp) return

    const bytes = new TextEncoder().encode(JSON.stringify(recipe, null, 2))
    const blob = new Blob([bytes], {
      type: 'application/json;charset=utf-8',
    })
    downloadFile(blob, newfilename.value)
  }

  async function loadRecipe() {
    const f = await openFile('application/json')
    if (!f) return
    const reader = new FileReader()
    await new Promise((r) => (reader.onload = r), reader.readAsText(f))

    let json
    try {
      json = JSON.parse(reader.result)
    } catch (e) {
      console.error('Invalid recipe JSON', e)
      return
    }

    // Reset scalar sections to defaults, then overlay
    for (const sec of Object.keys(DEFAULTS)) {
      for (const k of Object.keys(DEFAULTS[sec])) {
        params[sec][k] = DEFAULTS[sec][k]
      }
      if (json[sec]) Object.assign(params[sec], json[sec])
    }

    // HSL
    if (params.hsl) {
      for (const c of Object.keys(params.hsl)) {
        params.hsl[c].h = 0
        params.hsl[c].s = 0
        params.hsl[c].l = 0
      }
      if (json.hsl) {
        for (const c of Object.keys(json.hsl)) {
          if (params.hsl[c]) {
            params.hsl[c].h = json.hsl[c].h || 0
            params.hsl[c].s = json.hsl[c].s || 0
            params.hsl[c].l = json.hsl[c].l || 0
          }
        }
      }
    }

    // Curves
    if (json.curve?.curvepoints) params.curve.curvepoints = json.curve.curvepoints
    else params.curve.curvepoints = 0

    // Instagram filters — filters panel watches params.filters.label to rehydrate
    params.filters.opt = 0
    if (json.filters?.label) {
      params.filters.label = json.filters.label
      params.filters.mix = json.filters.mix ?? 1
    } else {
      params.filters.label = 0
      params.filters.mix = 0
    }

    // Blur
    if (json.blur) Object.assign(params.blur, json.blur)

    // Custom LUT — rehydrate store if text embedded
    if (json.customLUT) {
      const { name, size, text, mix } = json.customLUT
      params._lutStore = params._lutStore || new Map()
      if (text) {
        try {
          const parsed = parseCubeFile(text)
          const id = (name || 'embedded') + ':' + parsed.size + ':' + text.length
          params._lutStore.set(id, {
            id,
            name: parsed.title || name,
            filename: name,
            cubeText: text,
            ...parsed,
          })
          params.customluts.active = id
          params.customluts.mix = mix ?? 1
        } catch (e) {
          console.error('Failed to parse embedded LUT', e)
        }
      } else {
        // Reference-only: try to match by filename in current store
        let matched = 0
        for (const [id, lut] of params._lutStore) {
          if (lut.filename === name || lut.name === name) {
            matched = id
            break
          }
        }
        params.customluts.active = matched
        params.customluts.mix = mix ?? 1
      }
    } else {
      params.customluts.active = 0
    }

    $selection.value = null
    onUpdate()
  }

  return html`
    ${section(
      'recipes',
      null,
      $selection,
      params,
      null,
      null,
      () => html`
        <div>
          <button @click="${loadRecipe}">load</button>
          <button
            id="save_btn"
            @click="${saveRecipe}"
            disabled="${save_btn_disabled}"
          >
            save
          </button>
        </div>
        <div style="margin-top:4px;">
          <small>
            saves <i>lights, colors, effects, hsl, grain, vignette, curves,
            filters, blur, custom LUT</i> (LUTs embedded as .cube text)
          </small>
        </div>
      `,
    )}
  `
}

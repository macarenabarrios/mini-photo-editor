import { html, reactive, onMount, onUnmount } from '@xdadda/mini'

//Note: if onEnable notdefined/null the enable/disable button will not be visible
//Note: `height` is kept for backward-compatibility but ignored — sections now
//      auto-size to their content via scrollHeight measurement.
export default function section(
  sectionname,
  height,
  $selection,
  params,
  onEnable,
  onReset,
  sectionComponent,
) {
  // Auto-fit the section height to its content whenever this section is opened.
  // Runs after the DOM has rendered the content (rAF gives the browser one tick).
  reactive(
    () => {
      if ($selection.value !== sectionname) return
      requestAnimationFrame(() => {
        const sec = document.getElementById(sectionname)
        const content = document.getElementById(sectionname + '_content')
        if (!sec || !content) return
        // header is ~23px + some padding; content.scrollHeight gives the real inner size
        sec.style.height = content.scrollHeight + 40 + 'px'
      })
    },
    { effect: true },
  )

  function resetSection() {
    if (params[sectionname]?.$skip) return
    if (onReset) onReset(sectionname)
  }

  function handleSkipSection(e) {
    e.preventDefault()
    e.stopPropagation()
    const el_btn = document.getElementById('btn_skip_' + sectionname)
    const el_sec = document.getElementById(sectionname)
    const el_div = document.getElementById(sectionname + '_content')

    if (!params[sectionname].$skip) {
      //disable section
      params[sectionname].$skip = true
      el_btn?.setAttribute('disabled', true)
      el_sec?.setAttribute('skipped', true)
      el_div?.classList.add('skip')
      onEnable(false)
    } else {
      //enable section
      params[sectionname].$skip = false
      el_btn?.removeAttribute('disabled')
      el_sec?.removeAttribute('skipped')
      el_div?.classList.remove('skip')
      el_sec.style.opacity = ''
      onEnable(true)
    }
  }

  return html` <div
    class="section"
    id="${sectionname}"
    :style="${() => $selection.value !== sectionname && 'height:23px;'}"
    :selected="${() => $selection.value === sectionname}"
    @click="${(e) => {
      e.stopPropagation()
      $selection.value = sectionname
    }}"
  >
    <div class="section_header">
      ${!!onEnable &&
      html`<a
        id="btn_skip_${sectionname}"
        class="section_skip"
        @click="${handleSkipSection}"
        title="toggle"
        >☉</a
      >`}
      <b class="section_label">${sectionname}</b>
      ${!!onReset &&
      html`<a
        id="btn_reset_${sectionname}"
        class="reset_btn"
        @click="${resetSection}"
        disabled
        title="reset"
        >Ø</a
      >`}
    </div>

    ${() =>
      $selection.value === sectionname &&
      html`
        <div
          id="${sectionname}_content"
          class="section_content ${params[sectionname]?.$skip ? 'skip' : ''}"
          @click="${(e) => e.stopPropagation()}"
        >
          <div class="section_scroll">
            <hr />
            <button class="close_btn" @click="${() => ($selection.value = '')}">
              X
            </button>
            ${sectionComponent}
          </div>
        </div>
      `}
  </div>`
}

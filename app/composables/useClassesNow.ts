// Loads the current term's course schedule from Davidson's public course API,
// in the visitor's browser, and works out what's meeting now in each building.
// Nothing runs while the site is built: the page is static, and the schedule
// is fetched live when someone opens it.

const COURSES_API = 'https://api.davidson.edu/api/public/v2/courses'
const PAGE_SIZE = 1000
const MAX_PAGES = 10
const CLOCK_TICK_MS = 30_000
const RELOAD_MS = 15 * 60_000

async function fetchTermSections(termCode: string): Promise<ApiSection[]> {
  const sections: ApiSection[] = []
  for (let page = 0; page < MAX_PAGES; page++) {
    const batch = await $fetch<ApiSection[]>(COURSES_API, {
      query: { term_code: termCode, limit: PAGE_SIZE, offset: page * PAGE_SIZE },
    })
    sections.push(...batch)
    if (batch.length < PAGE_SIZE) break
  }
  return sections
}

export function useClassesNow() {
  const route = useRoute()
  const ready = ref(false)
  const loading = ref(false)
  const failed = ref(false)
  const clock = ref(new Date())
  const sessions = ref<ClassSession[]>([])
  const loadedTerm = ref<string | null>(null)

  const pinned = computed(() => {
    const at = route.query.at
    return typeof at === 'string' ? parseCampusMoment(at) : null
  })
  const moment = computed(() => pinned.value ?? campusMoment(clock.value))
  const status = computed(() => dayStatus(moment.value, TERMS))
  const termCode = computed(() => status.value.kind === 'classes' ? status.value.term.code : null)

  const inSession = computed(() => inSessionAt(sessions.value, moment.value, status.value))
  const startingSoon = computed(() => startingSoonAt(sessions.value, moment.value, status.value))
  const buildings = computed(() => groupByBuilding(inSession.value, startingSoon.value))

  async function load() {
    const code = termCode.value
    if (!code) return
    loading.value = true
    failed.value = false
    try {
      sessions.value = buildSessions(await fetchTermSections(code))
      loadedTerm.value = code
    }
    catch {
      failed.value = true
    }
    finally {
      loading.value = false
    }
  }

  let clockTimer: ReturnType<typeof setInterval> | undefined
  let reloadTimer: ReturnType<typeof setInterval> | undefined

  onMounted(() => {
    clock.value = new Date()
    ready.value = true
    load()
    clockTimer = setInterval(() => { clock.value = new Date() }, CLOCK_TICK_MS)
    reloadTimer = setInterval(load, RELOAD_MS)
    watch(termCode, (code) => { if (code && code !== loadedTerm.value) load() })
  })
  onBeforeUnmount(() => {
    clearInterval(clockTimer)
    clearInterval(reloadTimer)
  })

  return { ready, loading, failed, pinned, moment, status, buildings, inSession, startingSoon, reload: load, loadedTerm }
}

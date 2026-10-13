<!-- A compact list of class sessions in one building: in session now, or starting soon. -->
<script setup lang="ts">
const props = defineProps<{
  sessions: ClassSession[]
  /** "now" shows when each session ends; "soon" shows when it starts. */
  mode: 'now' | 'soon'
}>()

/** Each instructor once, even when a session combines sections they all teach. */
function instructors(session: ClassSession): string {
  const names = session.courses.flatMap(course => course.instructors.split(',').map(name => name.trim()))
  return [...new Set(names.filter(Boolean))].join(', ')
}

function timeNote(session: ClassSession): string {
  return props.mode === 'now'
    ? `until ${formatMinutes(session.end)}`
    : `starts ${formatMinutes(session.start)}`
}
</script>

<template>
  <ul class="mt-1 divide-y divide-(--color-dc-rule)">
    <li
      v-for="session in sessions"
      :key="`${session.room}-${session.start}`"
      class="grid grid-cols-[4rem_1fr] gap-x-3 py-2"
    >
      <span class="font-semibold tabular-nums">
        <span class="sr-only">Room </span>{{ session.room || '—' }}
      </span>
      <div>
        <p
          v-for="course in session.courses"
          :key="course.code"
          class="leading-snug"
        >
          <span class="font-semibold">{{ course.code }}</span> {{ course.title }}
          <span
            v-if="course.alsoListedAs.length"
            class="text-sm text-dc-muted"
          >(also {{ course.alsoListedAs.join(', ') }})</span>
        </p>
        <p class="text-sm text-dc-muted">
          {{ instructors(session) }} · {{ timeNote(session) }}
        </p>
      </div>
    </li>
  </ul>
</template>

<!-- A list of class sessions in one building: in session now, or starting soon. -->
<script setup lang="ts">
const props = defineProps<{
  sessions: ClassSession[]
  /** "now" shows when each session ends; "soon" shows when it starts. */
  mode: 'now' | 'soon'
}>()

function timeNote(session: ClassSession): string {
  return props.mode === 'now'
    ? `until ${formatMinutes(session.end)}`
    : `starts ${formatMinutes(session.start)}`
}
</script>

<template>
  <ul class="mt-2 space-y-3">
    <li
      v-for="session in sessions"
      :key="`${session.room}-${session.start}`"
      class="border-l-4 pl-3"
      :class="mode === 'now' ? 'border-dc-accent' : 'border-dc-muted/40'"
    >
      <p
        v-for="course in session.courses"
        :key="course.code"
        class="font-medium"
      >
        {{ course.code }}: {{ course.title }}
        <span
          v-if="course.alsoListedAs.length"
          class="text-sm font-normal text-dc-muted"
        >(also {{ course.alsoListedAs.join(', ') }})</span>
      </p>
      <p class="text-sm text-dc-muted">
        {{ session.room ? `Room ${session.room}` : 'Room not listed' }}
        · {{ session.courses.map(course => course.instructors).join('; ') }}
        · {{ timeNote(session) }}
      </p>
    </li>
  </ul>
</template>

<!-- The home page: what's being taught right now in each campus building. -->
<script setup lang="ts">
const { ready, loading, failed, pinned, moment, status, buildings, inSession, reload, loadedTerm } = useClassesNow()

const soonMinutes = SOON_MINUTES

const asOf = computed(() =>
  `${formatMinutes(moment.value.minutes)}, ${formatDate(moment.value.date)}`)

const waitingForFirstLoad = computed(() =>
  !ready.value || (status.value.kind === 'classes' && !loadedTerm.value && !failed.value))

const summary = computed(() => {
  const count = inSession.value.length
  if (count === 0) return 'No classes are meeting right now.'
  return count === 1 ? '1 class session is meeting right now.' : `${count} class sessions are meeting right now.`
})
</script>

<template>
  <section class="mx-auto max-w-6xl px-4 py-8">
    <h1 class="font-serif text-3xl font-bold md:text-4xl">
      What's being taught right now
    </h1>
    <p class="mt-2 text-dc-muted">
      Classes meeting in each campus building, from the Registrar's course schedule.
      Times are Eastern. Updates every minute.
    </p>

    <div
      class="mt-6"
      aria-live="polite"
    >
      <p
        v-if="!ready"
        class="font-medium"
      >
        Loading…
      </p>
      <template v-else>
        <p class="font-medium">
          <span v-if="pinned">Showing a set time: </span>As of {{ asOf }}
          <NuxtLink
            v-if="pinned"
            to="/"
            class="ml-2 text-(--color-dc-link) underline underline-offset-2"
          >
            See what's happening now
          </NuxtLink>
        </p>
        <p
          v-if="status.kind === 'classes' && status.endsLabel"
          class="mt-1 text-dc-muted"
        >
          {{ status.endsLabel }}.
        </p>
      </template>
    </div>

    <p
      v-if="ready && status.kind === 'no-classes'"
      class="mt-6 text-lg"
    >
      {{ status.reason }}
    </p>

    <div
      v-else-if="failed && !loadedTerm"
      class="mt-6"
      role="alert"
    >
      <p class="text-lg">
        We couldn't load the course schedule. Check your internet connection, then try again.
      </p>
      <button
        type="button"
        class="mt-3 rounded bg-(--color-dc-link) px-4 py-2 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-dc-link)"
        :disabled="loading"
        @click="reload"
      >
        {{ loading ? 'Trying again…' : 'Try again' }}
      </button>
    </div>

    <p
      v-else-if="waitingForFirstLoad"
      class="mt-6 text-lg"
    >
      Loading this term's course schedule…
    </p>

    <template v-else>
      <p class="mt-6 text-lg">
        {{ summary }}
        <span v-if="buildings.length === 0">Nothing starts in the next {{ soonMinutes }} minutes either.</span>
      </p>

      <ul class="mt-6 gap-6 md:columns-2 xl:columns-3">
        <li
          v-for="building in buildings"
          :key="building.building"
          class="mb-6 break-inside-avoid"
        >
          <BuildingCard :building="building" />
        </li>
      </ul>
    </template>
  </section>
</template>

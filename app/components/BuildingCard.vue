<!--
  One building: what's in session now and what starts soon. Busy buildings
  stay compact: the first few sessions show, and the rest and the "starting
  soon" list fold into native disclosure widgets, which work with a keyboard
  and screen readers without extra code.
-->
<script setup lang="ts">
const props = defineProps<{ building: BuildingNow }>()

/** Sessions shown before the rest fold away. */
const VISIBLE = 6

const soonMinutes = SOON_MINUTES
const shownNow = computed(() => props.building.inSession.slice(0, VISIBLE))
const moreNow = computed(() => props.building.inSession.slice(VISIBLE))
const busy = computed(() => props.building.inSession.length + props.building.startingSoon.length > VISIBLE)
</script>

<template>
  <article class="rounded-lg border border-(--color-dc-rule) border-t-4 border-t-dc-accent bg-dc-paper p-5">
    <header class="flex flex-wrap items-baseline justify-between gap-x-3">
      <h2 class="font-serif text-xl font-bold">
        {{ building.buildingName }}
      </h2>
      <p class="text-sm text-dc-muted">
        {{ building.inSession.length }} now · {{ building.startingSoon.length }} soon
      </p>
    </header>

    <section
      v-if="building.inSession.length"
      class="mt-3"
    >
      <h3 class="text-sm font-semibold uppercase tracking-wide text-dc-muted">
        In session
      </h3>
      <SessionList
        :sessions="shownNow"
        mode="now"
      />
      <details
        v-if="moreNow.length"
        class="group"
      >
        <summary class="cursor-pointer py-2 text-sm font-semibold text-(--color-dc-link) underline underline-offset-2">
          <span class="group-open:hidden">Show {{ moreNow.length }} more in session</span>
          <span class="hidden group-open:inline">Show fewer</span>
        </summary>
        <SessionList
          :sessions="moreNow"
          mode="now"
        />
      </details>
    </section>

    <section
      v-if="building.startingSoon.length"
      class="mt-3"
    >
      <details
        v-if="busy"
        class="group"
      >
        <summary class="cursor-pointer text-sm font-semibold uppercase tracking-wide text-dc-muted">
          <h3 class="inline">
            Starting in the next {{ soonMinutes }} minutes ({{ building.startingSoon.length }})
          </h3>
        </summary>
        <SessionList
          :sessions="building.startingSoon"
          mode="soon"
        />
      </details>
      <template v-else>
        <h3 class="text-sm font-semibold uppercase tracking-wide text-dc-muted">
          Starting in the next {{ soonMinutes }} minutes
        </h3>
        <SessionList
          :sessions="building.startingSoon"
          mode="soon"
        />
      </template>
    </section>
  </article>
</template>

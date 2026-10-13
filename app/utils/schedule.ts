// The schedule logic: turning the course schedule into "what's meeting now".
// Pure functions with no Nuxt or browser APIs, so the tests run them with
// plain Node (`npm test`). Times are campus time (America/New_York) and are
// counted in minutes since midnight.

export const CAMPUS_TIME_ZONE = 'America/New_York'

/** How far ahead "starting soon" looks, in minutes. */
export const SOON_MINUTES = 30

/** A moment on campus, in campus local time. */
export interface CampusMoment {
  /** YYYY-MM-DD */
  date: string
  /** 1 = Monday … 7 = Sunday, as the course schedule numbers days. */
  weekday: number
  /** Minutes since midnight. */
  minutes: number
}

/** One term's teaching dates, from the Registrar's academic calendar. */
export interface Term {
  code: string
  name: string
  /** First and last days of scheduled classes, YYYY-MM-DD. */
  classesBegin: string
  classesEnd: string
  /** Inclusive date ranges with no classes, such as breaks. */
  noClasses: { from: string, to: string, label: string }[]
  /** Days when classes stop early, such as the start of Thanksgiving break. */
  endsEarly: { date: string, at: number, label: string }[]
  /** Days that follow another weekday's meeting schedule. */
  followsSchedule: { date: string, weekday: number }[]
  /** Class start times cancelled on a single day, such as for convocation. */
  cancelledStarts: { date: string, start: number, label: string }[]
}

/** The parts of the public course API's records that the app reads. */
export interface ApiMeeting {
  days: number[] | null
  start_time: string | null
  end_time: string | null
  room: string | null
  building: { code: string, description: string } | null
}

export interface ApiSection {
  crn: number
  display: string
  course_title: string
  instructors_string: string | null
  cross_listings: { subject_code: string, course_number: string, section: string }[] | null
  meetings: ApiMeeting[] | null
}

export interface SessionCourse {
  /** Such as "BIO 331 A". */
  code: string
  title: string
  instructors: string
  /** Codes it's cross-listed under, such as "PSY 303 A". */
  alsoListedAs: string[]
}

/** One room, one meeting time: every course that meets there together. */
export interface ClassSession {
  building: string
  buildingName: string
  room: string
  days: number[]
  start: number
  end: number
  courses: SessionCourse[]
}

export type DayStatus =
  | {
    kind: 'classes'
    term: Term
    /** The weekday whose meeting schedule runs today. */
    scheduleWeekday: number
    /** When classes stop early today, if they do. */
    endsAt: number | null
    endsLabel: string | null
    cancelledStarts: number[]
  }
  | { kind: 'no-classes', reason: string, term: Term | null }

export interface BuildingNow {
  building: string
  buildingName: string
  inSession: ClassSession[]
  startingSoon: ClassSession[]
}

const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

/** "1430" → 870. Returns null for anything that isn't a 24-hour HHMM time. */
export function hhmmToMinutes(value: string | null): number | null {
  if (!value || !/^\d{4}$/.test(value)) return null
  const hours = Number(value.slice(0, 2))
  const minutes = Number(value.slice(2))
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

/** 870 → "2:30 PM". */
export function formatMinutes(total: number): string {
  const hours24 = Math.floor(total / 60)
  const minutes = total % 60
  const suffix = hours24 >= 12 ? 'PM' : 'AM'
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12
  return `${hours12}:${String(minutes).padStart(2, '0')} ${suffix}`
}

function weekdayOf(date: string): number {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number]
  const sundayFirst = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  return sundayFirst === 0 ? 7 : sundayFirst
}

/** "2026-10-13" → "Tuesday, October 13". */
export function formatDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number]
  const monthName = new Date(Date.UTC(year, month - 1, day))
    .toLocaleString('en-US', { month: 'long', timeZone: 'UTC' })
  return `${WEEKDAY_NAMES[weekdayOf(date) - 1]}, ${monthName} ${day}`
}

/** The campus moment for an instant, whatever the viewer's own time zone. */
export function campusMoment(instant: Date): CampusMoment {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: CAMPUS_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(instant).map(part => [part.type, part.value]),
  )
  const date = `${parts.year}-${parts.month}-${parts.day}`
  return { date, weekday: weekdayOf(date), minutes: Number(parts.hour) * 60 + Number(parts.minute) }
}

/** "2026-10-14T10:00", read as campus time, for checking another moment. */
export function parseCampusMoment(value: string): CampusMoment | null {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/.exec(value)
  if (!match) return null
  const [, date, hours, minutes] = match as unknown as [string, string, string, string]
  const total = hhmmToMinutes(hours + minutes)
  if (total === null || Number.isNaN(new Date(`${date}T00:00:00Z`).getTime())) return null
  return { date, weekday: weekdayOf(date), minutes: total }
}

/** The term whose scheduled classes include this date, if any. */
export function termFor(date: string, terms: Term[]): Term | null {
  return terms.find(term => term.classesBegin <= date && date <= term.classesEnd) ?? null
}

/** Whether classes meet on this date, and on which weekday's schedule. */
export function dayStatus(moment: CampusMoment, terms: Term[]): DayStatus {
  const term = termFor(moment.date, terms)
  if (!term) {
    return { kind: 'no-classes', reason: 'Classes aren\'t in session right now. The semester is over or hasn\'t started.', term: null }
  }
  const off = term.noClasses.find(range => range.from <= moment.date && moment.date <= range.to)
  if (off) return { kind: 'no-classes', reason: `No classes today: ${off.label}.`, term }

  const swap = term.followsSchedule.find(day => day.date === moment.date)
  const scheduleWeekday = swap ? swap.weekday : moment.weekday
  if (scheduleWeekday > 5) return { kind: 'no-classes', reason: 'No classes meet on weekends.', term }

  const early = term.endsEarly.find(day => day.date === moment.date)
  return {
    kind: 'classes',
    term,
    scheduleWeekday,
    endsAt: early ? early.at : null,
    endsLabel: early ? early.label : null,
    cancelledStarts: term.cancelledStarts.filter(day => day.date === moment.date).map(day => day.start),
  }
}

function courseFor(section: ApiSection): SessionCourse {
  const code = section.display.split(':')[0]?.trim() || section.display
  return {
    code,
    title: section.course_title,
    instructors: section.instructors_string?.trim() || 'Instructor not listed',
    alsoListedAs: (section.cross_listings ?? []).map(listing =>
      [listing.subject_code, listing.course_number, listing.section === '0' ? '' : listing.section]
        .filter(Boolean).join(' ')),
  }
}

/**
 * Turns course sections into sessions: one per room and meeting time, with
 * every course that meets there. Meetings without a building, days or times
 * (independent studies, "TBA") are left out. A course listed under two codes
 * appears once.
 */
export function buildSessions(sections: ApiSection[]): ClassSession[] {
  const sessions = new Map<string, ClassSession>()
  for (const section of sections) {
    const course = courseFor(section)
    for (const meeting of section.meetings ?? []) {
      const start = hhmmToMinutes(meeting.start_time)
      const end = hhmmToMinutes(meeting.end_time)
      const days = (meeting.days ?? []).filter(day => day >= 1 && day <= 7)
      if (!meeting.building || start === null || end === null || end <= start || days.length === 0) continue

      const room = meeting.room?.trim() || ''
      const key = [meeting.building.code, room, start, end, [...days].sort().join('')].join('|')
      let session = sessions.get(key)
      if (!session) {
        session = {
          building: meeting.building.code,
          buildingName: meeting.building.description,
          room,
          days: [...days].sort(),
          start,
          end,
          courses: [],
        }
        sessions.set(key, session)
      }
      const listed = session.courses.some(existing =>
        existing.code === course.code || existing.alsoListedAs.includes(course.code))
      if (!listed) session.courses.push(course)
    }
  }
  return [...sessions.values()]
}

function meetsToday(session: ClassSession, status: Extract<DayStatus, { kind: 'classes' }>): boolean {
  return session.days.includes(status.scheduleWeekday)
    && !status.cancelledStarts.includes(session.start)
    && (status.endsAt === null || session.start < status.endsAt)
}

/** Sessions meeting at this moment. */
export function inSessionAt(sessions: ClassSession[], moment: CampusMoment, status: DayStatus): ClassSession[] {
  if (status.kind !== 'classes') return []
  if (status.endsAt !== null && moment.minutes >= status.endsAt) return []
  return sessions.filter(session =>
    meetsToday(session, status) && session.start <= moment.minutes && moment.minutes < session.end)
}

/** Sessions starting within the next SOON_MINUTES. */
export function startingSoonAt(sessions: ClassSession[], moment: CampusMoment, status: DayStatus): ClassSession[] {
  if (status.kind !== 'classes') return []
  return sessions.filter(session =>
    meetsToday(session, status)
    && session.start > moment.minutes
    && session.start - moment.minutes <= SOON_MINUTES)
}

function byTimeThenRoom(a: ClassSession, b: ClassSession): number {
  return a.start - b.start || a.room.localeCompare(b.room, 'en', { numeric: true })
}

/** Groups what's meeting now and soon by building, buildings in name order. */
export function groupByBuilding(inSession: ClassSession[], startingSoon: ClassSession[]): BuildingNow[] {
  const buildings = new Map<string, BuildingNow>()
  const entry = (session: ClassSession): BuildingNow => {
    let building = buildings.get(session.building)
    if (!building) {
      building = { building: session.building, buildingName: session.buildingName, inSession: [], startingSoon: [] }
      buildings.set(session.building, building)
    }
    return building
  }
  for (const session of inSession) entry(session).inSession.push(session)
  for (const session of startingSoon) entry(session).startingSoon.push(session)
  for (const building of buildings.values()) {
    building.inSession.sort(byTimeThenRoom)
    building.startingSoon.sort(byTimeThenRoom)
  }
  return [...buildings.values()].sort((a, b) => a.buildingName.localeCompare(b.buildingName))
}

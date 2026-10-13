// Tests for the schedule logic, with made-up courses and a made-up term.
// Run with `npm test` (Node's built-in test runner).
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  buildSessions, campusMoment, dayStatus, formatDate, formatMinutes, groupByBuilding,
  hhmmToMinutes, inSessionAt, parseCampusMoment, startingSoonAt,
} from '../app/utils/schedule.ts'

const term = {
  code: '999901',
  name: 'Example Term',
  classesBegin: '2030-01-07',
  classesEnd: '2030-05-03',
  noClasses: [{ from: '2030-03-11', to: '2030-03-15', label: 'Example Break' }],
  endsEarly: [{ date: '2030-04-12', at: 12 * 60, label: 'Classes end at noon' }],
  followsSchedule: [{ date: '2030-04-16', weekday: 1 }],
  cancelledStarts: [{ date: '2030-04-17', start: 10 * 60, label: 'Example Assembly' }],
}

const meeting = (days, start, end, building = 'EXA', room = '101') => ({
  days, start_time: start, end_time: end, room,
  building: building ? { code: building, description: `${building} Hall` } : null,
})

const sections = [
  {
    crn: 1, display: 'EXM 101: Example Studies', course_title: 'Example Studies',
    instructors_string: 'A Example', cross_listings: [], meetings: [meeting([1, 3, 5], '1000', '1050')],
  },
  {
    crn: 2, display: 'EXM 210 A: Made-up Methods', course_title: 'Made-up Methods',
    instructors_string: 'B Sample',
    cross_listings: [{ subject_code: 'SMP', course_number: '310', section: 'A' }],
    meetings: [meeting([2, 4], '0940', '1055', 'SMP', '2')],
  },
  {
    // The same class under its cross-listed code: it appears once.
    crn: 3, display: 'SMP 310 A: Made-up Methods', course_title: 'Made-up Methods',
    instructors_string: 'B Sample',
    cross_listings: [{ subject_code: 'EXM', course_number: '210', section: 'A' }],
    meetings: [meeting([2, 4], '0940', '1055', 'SMP', '2')],
  },
  {
    crn: 4, display: 'EXM 498: Independent Study', course_title: 'Independent Study',
    instructors_string: 'C Placeholder', cross_listings: [],
    meetings: [{ days: [], start_time: null, end_time: null, room: null, building: null }],
  },
]

const at = value => parseCampusMoment(value)
const sessions = buildSessions(sections)

test('converts times', () => {
  assert.equal(hhmmToMinutes('1430'), 870)
  assert.equal(hhmmToMinutes('2460'), null)
  assert.equal(hhmmToMinutes(null), null)
  assert.equal(formatMinutes(870), '2:30 PM')
  assert.equal(formatMinutes(0), '12:00 AM')
  assert.equal(formatMinutes(12 * 60 + 5), '12:05 PM')
  assert.equal(formatDate('2030-01-07'), 'Monday, January 7')
})

test('reads campus time whatever the viewer\'s time zone', () => {
  // 14:30 UTC on a July day is 10:30 in Davidson (daylight time).
  assert.deepEqual(campusMoment(new Date('2030-07-01T14:30:00Z')), { date: '2030-07-01', weekday: 1, minutes: 630 })
  // In January it's 9:30 (standard time).
  assert.deepEqual(campusMoment(new Date('2030-01-07T14:30:00Z')), { date: '2030-01-07', weekday: 1, minutes: 570 })
  assert.equal(parseCampusMoment('not a time'), null)
})

test('builds one session per room and time, leaving out TBA meetings', () => {
  assert.equal(sessions.length, 2)
  const crossListed = sessions.find(session => session.building === 'SMP')
  assert.equal(crossListed.courses.length, 1)
  assert.deepEqual(crossListed.courses[0].alsoListedAs, ['SMP 310 A'])
})

test('finds what is in session and starting soon', () => {
  const monday = at('2030-01-07T10:15')
  const status = dayStatus(monday, [term])
  assert.equal(status.kind, 'classes')
  assert.deepEqual(inSessionAt(sessions, monday, status).map(s => s.building), ['EXA'])

  const beforeClass = at('2030-01-07T09:40')
  assert.deepEqual(startingSoonAt(sessions, beforeClass, dayStatus(beforeClass, [term])).map(s => s.building), ['EXA'])

  // A class has ended at its end time.
  const atEnd = at('2030-01-07T10:50')
  assert.equal(inSessionAt(sessions, atEnd, dayStatus(atEnd, [term])).length, 0)
})

test('knows weekends, breaks and the time between terms', () => {
  assert.equal(dayStatus(at('2030-01-12T10:15'), [term]).kind, 'no-classes')
  assert.match(dayStatus(at('2030-03-13T10:15'), [term]).reason, /Example Break/)
  assert.equal(dayStatus(at('2030-06-03T10:15'), [term]).term, null)
})

test('follows schedule swaps, early endings and cancelled starts', () => {
  // A Tuesday that follows the Monday schedule.
  const swapped = at('2030-04-16T10:15')
  assert.deepEqual(inSessionAt(sessions, swapped, dayStatus(swapped, [term])).map(s => s.building), ['EXA'])

  // Classes ending at noon on a Friday: the 10:00 class still meets.
  const early = at('2030-04-12T10:15')
  assert.equal(inSessionAt(sessions, early, dayStatus(early, [term])).length, 1)

  // The 10:00 start is cancelled on this Wednesday.
  const cancelled = at('2030-04-17T10:15')
  assert.equal(inSessionAt(sessions, cancelled, dayStatus(cancelled, [term])).length, 0)
})

test('groups by building in name order', () => {
  const tuesday = at('2030-01-08T09:20')
  const status = dayStatus(tuesday, [term])
  const groups = groupByBuilding(inSessionAt(sessions, tuesday, status), startingSoonAt(sessions, tuesday, status))
  assert.deepEqual(groups.map(group => [group.buildingName, group.inSession.length, group.startingSoon.length]), [['SMP Hall', 0, 1]])
})

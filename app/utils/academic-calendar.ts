// Teaching dates for each term, from the Registrar's published academic
// calendar (davidson.edu, Offices and Services > Registrar > Academic
// Calendars, 2026-2027, updated 3/10/2026). The course API doesn't carry
// breaks or schedule swaps, so they live here. Add the next academic year's
// terms before it starts; see BUILDER.md.
import type { Term } from './schedule'

export const TERMS: Term[] = [
  {
    code: '202601',
    name: 'Fall 2026',
    classesBegin: '2026-08-24',
    classesEnd: '2026-12-08',
    noClasses: [
      { from: '2026-09-21', to: '2026-09-22', label: 'Fall Break' },
      { from: '2026-11-21', to: '2026-11-29', label: 'Thanksgiving Break' },
    ],
    // Thanksgiving break begins Friday, Nov. 20, at 4:20 p.m.
    endsEarly: [{ date: '2026-11-20', at: 16 * 60 + 20, label: 'Thanksgiving Break begins at 4:20 PM' }],
    followsSchedule: [],
    cancelledStarts: [],
  },
  {
    code: '202602',
    name: 'Spring 2027',
    classesBegin: '2027-01-19',
    classesEnd: '2027-05-05',
    noClasses: [
      { from: '2027-03-08', to: '2027-03-12', label: 'Spring Break' },
      { from: '2027-03-26', to: '2027-03-26', label: 'March/April Break' },
      { from: '2027-03-29', to: '2027-03-29', label: 'March/April Break' },
    ],
    endsEarly: [],
    followsSchedule: [
      // Tuesday, April 20, follows the Monday schedule; Wednesday, May 5, the Friday one.
      { date: '2027-04-20', weekday: 1 },
      { date: '2027-05-05', weekday: 5 },
    ],
    // Spring Convocation, Tuesday, April 13: only the 12:15 p.m. classes are cancelled.
    cancelledStarts: [{ date: '2027-04-13', start: 12 * 60 + 15, label: 'Spring Convocation' }],
  },
]

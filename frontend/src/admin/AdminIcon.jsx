/* Compact line signs for the staff navigation and its table actions. */
const paths = {
  grid: 'M2.5 3.5h15v13h-15z M7 3.5v13 M7 8h10.5 M7 12.5h10.5',
  calendar: 'M3 5h14v12H3z M6 2.5v5 M14 2.5v5 M3 9h14 M6 12h3 M11 12h3',
  court: 'M2 4.5h16v11H2z M10 4.5v11 M5 4.5v11 M15 4.5v11 M5 10h10',
  trophy: 'M2 4h4v4h4v4H6v4H2 M18 4h-4v4h-4 M18 16h-4v-4h-4',
  message: 'M2.5 4.5h15v10h-9L4 17v-2.5H2.5z M5.5 8h9 M5.5 11h5',
  tag: 'M3 4h7l7 6.5-6 6L3 9z M6 7h1',
  users: 'M1.5 4h17v12h-17z M4.5 7h4v3h-4z M4 13h5.5 M12 8h4 M12 11h3',
  menu: 'M2.5 5h15 M2.5 10h10 M2.5 15h15',
  close: 'M4.5 4.5l11 11 M15.5 4.5l-11 11',
  arrow: 'M2.5 10h14 M11.5 5l5 5-5 5',
  logout: 'M9 3H3v14h6 M7 10h10 M13 6l4 4-4 4',
  sun: 'M6.5 10a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0 M10 1v3 M10 16v3 M1 10h3 M16 10h3 M3.5 3.5l2 2 M14.5 14.5l2 2 M3.5 16.5l2-2 M14.5 5.5l2-2',
  moon: 'M11.5 2.5a7.5 7.5 0 1 0 6 11.5 8 8 0 0 1-6-11.5z',
  plus: 'M3 10h14 M10 3v14', check: 'M2.5 10.5l4.5 4.3L17.5 4.7',
  edit: 'M3 13.5L13.5 3l3.5 3.5L6.5 17H3z M11.5 5l3.5 3.5',
  publish: 'M3 13v4h14v-4 M10 13V3 M5.5 7.5L10 3l4.5 4.5',
  cancel: 'M3 5h14v10H3z M7 10h6',
  refresh: 'M16.5 8A6.5 6.5 0 1 0 16 14 M16.5 3.5V8h-4.5',
  search: 'M3 8.5a5.5 5.5 0 1 0 11 0a5.5 5.5 0 1 0-11 0 M12.5 12.5l5 5',
}

export default function AdminIcon({ name, size = 18 }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 20 20" fill="none"
    stroke="currentColor" strokeWidth="1.45" strokeLinejoin="round" strokeLinecap="round"><path d={paths[name]} /></svg>
}

// All club times are shown in Jordan time, whatever the browser's time zone is
const ZONE = 'Asia/Amman'

export function formatDateTime(iso) {
  return new Date(iso).toLocaleString('en-GB', {
    timeZone: ZONE, weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })
}

export function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('en-GB', {
    timeZone: ZONE, hour: '2-digit', minute: '2-digit',
  })
}

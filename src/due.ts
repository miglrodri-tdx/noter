/** `due` is a local `YYYY-MM-DDTHH:mm` string (datetime-local format). */
export const formatDue = (due: string) =>
  new Date(due).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export const isOverdue = (due: string) => new Date(due).getTime() < Date.now()

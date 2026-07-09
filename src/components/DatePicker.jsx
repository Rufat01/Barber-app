import { useEffect, useRef, useState } from 'react'
import { DayPicker } from 'react-day-picker'
import { formatDateAzFull } from '../lib/date'

const AZ_MONTHS = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun',
  'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr',
]
const AZ_WEEKDAYS_SHORT = ['B', 'B.e', 'Ç.a', 'Ç', 'C.a', 'C', 'Ş']

function toIsoDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function fromIsoDate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function DayButton({ day: _day, modifiers, className: _className, ...props }) {
  const stateClass = modifiers.disabled
    ? 'text-gray-300 cursor-not-allowed'
    : modifiers.selected
      ? 'bg-gray-900 text-white hover:bg-gray-800'
      : modifiers.today
        ? 'font-bold text-gray-900 hover:bg-gray-100'
        : modifiers.outside
          ? 'text-gray-300 hover:bg-gray-50'
          : 'text-gray-700 hover:bg-gray-100'

  return <button type="button" className={`w-9 h-9 rounded-lg text-sm ${stateClass}`} {...props} />
}

/**
 * `value`/`onChange` "YYYY-MM-DD" formatındadır.
 * `minDate` verilsə (məs. "YYYY-MM-DD"), ondan əvvəlki günlər təqvimdə seçilə bilməz.
 */
function DatePicker({ value, onChange, minDate }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!open) return

    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  function handleSelect(date) {
    if (!date) return
    onChange(toIsoDate(date))
    setOpen(false)
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-left text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
      >
        {value ? formatDateAzFull(value) : 'Tarix seçin'}
      </button>

      {open && (
        <div className="absolute z-10 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg p-2">
          <DayPicker
            mode="single"
            selected={value ? fromIsoDate(value) : undefined}
            onSelect={handleSelect}
            disabled={minDate ? { before: fromIsoDate(minDate) } : undefined}
            weekStartsOn={1}
            navLayout="around"
            components={{ DayButton }}
            formatters={{
              formatCaption: (month) => `${AZ_MONTHS[month.getMonth()]} ${month.getFullYear()}`,
              formatWeekdayName: (weekday) => AZ_WEEKDAYS_SHORT[weekday.getDay()],
            }}
            classNames={{
              months: 'block',
              month: 'relative space-y-2',
              button_previous:
                'absolute left-0 top-0 z-10 h-7 w-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500',
              button_next:
                'absolute right-0 top-0 z-10 h-7 w-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500',
              chevron: 'w-4 h-4 fill-gray-500',
              month_caption: 'flex justify-center items-center h-7 font-medium text-sm text-gray-900',
              month_grid: 'border-collapse',
              weekdays: 'flex',
              weekday: 'text-gray-400 text-xs font-medium w-9 h-9 flex items-center justify-center',
              week: 'flex',
              day: 'p-0 text-center align-middle',
            }}
          />
        </div>
      )}
    </div>
  )
}

export default DatePicker

import { formatDate, parseDate, addDays, addMonths, addYears } from '../physics/epoch.js';

/**
 * Initialise the date picker section in the control panel.
 *
 * Reads the current date from the <input id="date-input"> element,
 * wires up the step buttons, and calls `onChange(date)` whenever the
 * selected date changes.
 *
 * @param {function} onChange  - called with a Date whenever the date changes
 * @returns {{ getDate: function, setDate: function }}
 */
export function initDatePicker(onChange) {
  const input    = document.getElementById('date-input');
  const todayBtn = document.getElementById('date-today');

  const stepButtons = [
    { id: 'step-prev-year',  delta: -1, unit: 'year'  },
    { id: 'step-prev-month', delta: -1, unit: 'month' },
    { id: 'step-prev-day',   delta: -1, unit: 'day'   },
    { id: 'step-next-day',   delta:  1, unit: 'day'   },
    { id: 'step-next-month', delta:  1, unit: 'month' },
    { id: 'step-next-year',  delta:  1, unit: 'year'  },
  ];

  let currentDate = new Date();
  input.value = formatDate(currentDate);

  function emit(date) {
    currentDate = date;
    input.value = formatDate(date);
    onChange(date);
  }

  input.addEventListener('change', () => {
    const parsed = parseDate(input.value);
    if (!isNaN(parsed)) emit(parsed);
  });

  todayBtn.addEventListener('click', () => emit(new Date()));

  for (const { id, delta, unit } of stepButtons) {
    document.getElementById(id).addEventListener('click', () => {
      let next;
      if (unit === 'day')   next = addDays(currentDate, delta);
      if (unit === 'month') next = addMonths(currentDate, delta);
      if (unit === 'year')  next = addYears(currentDate, delta);
      emit(next);
    });
  }

  return {
    getDate: () => currentDate,
    setDate: (date) => emit(date),
  };
}

import { formatDisplayDate, formatDisplayTime } from '../lib/availability';
import { seatingLabel } from '../lib/parser';
import type { BookingDraft, BookingField } from '../lib/types';

interface Props {
  draft: BookingDraft;
  onEdit: (field: BookingField) => void;
  editable: boolean;
}

const ROWS: { field: BookingField; label: string; value: (d: BookingDraft) => string }[] = [
  {
    field: 'date',
    label: 'Date',
    value: (d) => (d.date ? formatDisplayDate(d.date) : '—'),
  },
  {
    field: 'time',
    label: 'Time',
    value: (d) => (d.time ? formatDisplayTime(d.time) : '—'),
  },
  {
    field: 'guests',
    label: 'Guests',
    value: (d) => (d.guests ? String(d.guests) : '—'),
  },
  {
    field: 'seating',
    label: 'Seating',
    value: (d) => (d.seating ? seatingLabel(d.seating) : '—'),
  },
  {
    field: 'name',
    label: 'Name',
    value: (d) => d.name ?? '—',
  },
  {
    field: 'contact',
    label: 'Contact',
    value: (d) => d.contact ?? '—',
  },
];

export function BookingSummary({ draft, onEdit, editable }: Props) {
  const filled = ROWS.filter((r) => {
    if (r.field === 'contact') return Boolean(draft.contact);
    return draft[r.field] !== undefined && draft[r.field] !== '';
  }).length;

  return (
    <aside className="summary" aria-labelledby="summary-heading">
      <div className="summary__head">
        <h2 id="summary-heading">Booking summary</h2>
        <span className="summary__count">
          {filled}/6 details
        </span>
      </div>
      <ul className="summary__list">
        {ROWS.map((row) => {
          const hasValue =
            row.field === 'contact'
              ? Boolean(draft.contact)
              : draft[row.field] !== undefined && draft[row.field] !== '';
          return (
            <li key={row.field} className={hasValue ? 'is-filled' : ''}>
              <div>
                <span className="summary__label">{row.label}</span>
                <span className="summary__value">{row.value(draft)}</span>
              </div>
              {editable && (
                <button
                  type="button"
                  className="summary__edit"
                  onClick={() => onEdit(row.field)}
                  aria-label={`Edit ${row.label}`}
                >
                  Edit
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <p className="summary__privacy">
        Privacy: we only collect reservation details and one contact method for this booking. No payment
        data is requested. This prototype does not send your answers to a server.
      </p>
    </aside>
  );
}

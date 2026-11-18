import { summarizeDraft } from '../lib/conversation';
import type { BookingDraft } from '../lib/types';

interface Props {
  open: boolean;
  draft: BookingDraft;
  onConfirm: () => void;
  onEdit: () => void;
  onClose: () => void;
}

export function ConfirmModal({ open, draft, onConfirm, onEdit, onClose }: Props) {
  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-desc"
      >
        <h2 id="confirm-title">Confirm your reservation</h2>
        <p id="confirm-desc" className="modal__summary">
          {summarizeDraft(draft)}
        </p>
        <p className="modal__note">
          Simulated booking only — no real restaurant API or payment is involved.
        </p>
        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onEdit}>
            Edit details
          </button>
          <button type="button" className="btn btn--primary" onClick={onConfirm} autoFocus>
            Confirm booking
          </button>
        </div>
      </div>
    </div>
  );
}

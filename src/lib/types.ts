export type AvatarStatus =
  | 'waiting'
  | 'listening'
  | 'processing'
  | 'speaking'
  | 'completed'
  | 'paused';

export type SeatingPreference = 'indoor' | 'outdoor' | 'bar' | 'window';

export type BookingField =
  | 'date'
  | 'time'
  | 'guests'
  | 'seating'
  | 'name'
  | 'contact';

export interface BookingDraft {
  date?: string; // YYYY-MM-DD
  time?: string; // HH:MM 24h
  guests?: number;
  seating?: SeatingPreference;
  name?: string;
  contact?: string;
  contactType?: 'phone' | 'email';
}

export type ConversationPhase =
  | 'greeting'
  | 'collecting'
  | 'review'
  | 'confirming'
  | 'completed';

export type MessageRole = 'ava' | 'user' | 'system';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  source?: 'typed' | 'voice' | 'chip';
  timestamp: number;
}

export interface QuickChoice {
  label: string;
  value: string;
}

export interface EngineResult {
  messages: ChatMessage[];
  draft: BookingDraft;
  phase: ConversationPhase;
  currentField: BookingField | null;
  quickChoices: QuickChoice[];
  avaReply: string;
  showConfirmModal: boolean;
  confirmationCode?: string;
}

export interface ParseResult {
  draftPatch: Partial<BookingDraft>;
  unrecognized: boolean;
  incomplete: boolean;
  invalidReason?: string;
  wantsCorrection?: boolean;
  correctionField?: BookingField;
  wantsConfirm?: boolean;
  wantsDeny?: boolean;
  wantsRestart?: boolean;
  wantsBack?: boolean;
  wantsPause?: boolean;
  wantsResume?: boolean;
  rawIntent?: string;
}

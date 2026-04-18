ALTER TABLE sentence_cards
  ADD COLUMN category VARCHAR(16) NOT NULL DEFAULT 'vocab' AFTER id;

CREATE INDEX idx_sentence_category ON sentence_cards (category);

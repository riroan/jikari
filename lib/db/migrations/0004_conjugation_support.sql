ALTER TABLE learning_states
  MODIFY card_key VARCHAR(128) NOT NULL;

ALTER TABLE vocab_cards
  ADD COLUMN verb_group VARCHAR(16) NULL;

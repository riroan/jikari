-- Update kana-stored adjectives to their canonical kanji display forms.
-- Ruby markup preserves the original pronunciation above kanji.
-- IDs stay as-is so existing learning_states entries keep referencing the same cards.

UPDATE vocab_cards
  SET word = '美味しい', ruby = '{美味|おい}しい'
  WHERE id = 'おいしい';

UPDATE vocab_cards
  SET word = '綺麗', ruby = '{綺麗|きれい}'
  WHERE id = 'きれい';

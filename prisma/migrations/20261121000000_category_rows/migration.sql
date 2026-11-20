-- Expense categories (src/lib/categories.ts). Expenses reference them, so
-- every database needs the rows, not just seeded ones.
INSERT INTO "Category" ("id", "name", "icon") VALUES
  ('food', 'Food & drink', 'utensils'),
  ('groceries', 'Groceries', 'shopping-basket'),
  ('lodging', 'Lodging', 'bed-double'),
  ('transport', 'Transport', 'car'),
  ('activities', 'Activities', 'ticket'),
  ('utilities', 'Utilities', 'zap'),
  ('rent', 'Rent', 'house'),
  ('shopping', 'Shopping', 'shopping-bag'),
  ('other', 'Other', 'receipt')
ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name", "icon" = EXCLUDED."icon";

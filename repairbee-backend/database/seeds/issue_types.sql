-- Seed: Predefined issue types per product
-- Depends on products seed being run first

-- Phone issues
INSERT INTO issue_types (product_id, issue_label, display_order)
SELECT p.id, i.label, i.ord
FROM products p
CROSS JOIN (VALUES
  ('Screen broken / cracked', 1),
  ('Battery draining fast', 2),
  ('Not charging', 3),
  ('Water damage', 4),
  ('Speaker not working', 5),
  ('Microphone issue', 6),
  ('Camera not working', 7),
  ('Software / OS issue', 8),
  ('Overheating', 9),
  ('Not turning on', 10),
  ('Button not working', 11),
  ('Network / SIM issue', 12)
) AS i(label, ord)
WHERE p.product_name = 'Phone';

-- Laptop issues
INSERT INTO issue_types (product_id, issue_label, display_order)
SELECT p.id, i.label, i.ord
FROM products p
CROSS JOIN (VALUES
  ('Screen broken / cracked', 1),
  ('Keyboard not working', 2),
  ('Battery draining fast', 3),
  ('Not turning on', 4),
  ('Overheating', 5),
  ('Slow performance', 6),
  ('Hard drive / SSD failure', 7),
  ('Trackpad issue', 8),
  ('Hinge broken', 9),
  ('Charging port issue', 10),
  ('Wi-Fi not connecting', 11),
  ('Blue screen / crash', 12),
  ('Speaker issue', 13),
  ('RAM upgrade needed', 14)
) AS i(label, ord)
WHERE p.product_name = 'Laptop';

-- TV issues
INSERT INTO issue_types (product_id, issue_label, display_order)
SELECT p.id, i.label, i.ord
FROM products p
CROSS JOIN (VALUES
  ('Screen cracked', 1),
  ('No display / black screen', 2),
  ('No sound', 3),
  ('Remote not working', 4),
  ('Color distortion', 5),
  ('Not turning on', 6),
  ('Smart TV software issue', 7),
  ('HDMI port not working', 8),
  ('Backlight issue', 9),
  ('Power fluctuation', 10)
) AS i(label, ord)
WHERE p.product_name = 'TV';

-- AC issues
INSERT INTO issue_types (product_id, issue_label, display_order)
SELECT p.id, i.label, i.ord
FROM products p
CROSS JOIN (VALUES
  ('Not cooling', 1),
  ('Gas leak / refill needed', 2),
  ('Compressor noise', 3),
  ('Water leaking', 4),
  ('Remote not working', 5),
  ('Not turning on', 6),
  ('Bad smell', 7),
  ('Auto shut-off issue', 8),
  ('Installation / uninstallation', 9),
  ('General servicing', 10)
) AS i(label, ord)
WHERE p.product_name = 'AC';

-- Fridge issues
INSERT INTO issue_types (product_id, issue_label, display_order)
SELECT p.id, i.label, i.ord
FROM products p
CROSS JOIN (VALUES
  ('Not cooling', 1),
  ('Over cooling / freezing', 2),
  ('Water leaking', 3),
  ('Strange noise', 4),
  ('Door not closing properly', 5),
  ('Ice maker issue', 6),
  ('Not turning on', 7),
  ('Light not working', 8),
  ('Compressor issue', 9),
  ('Gas refill needed', 10)
) AS i(label, ord)
WHERE p.product_name = 'Fridge';

-- Washing Machine issues
INSERT INTO issue_types (product_id, issue_label, display_order)
SELECT p.id, i.label, i.ord
FROM products p
CROSS JOIN (VALUES
  ('Not spinning', 1),
  ('Water not draining', 2),
  ('Leaking water', 3),
  ('Not turning on', 4),
  ('Excessive vibration', 5),
  ('Door lock issue', 6),
  ('Bad smell', 7),
  ('Display / panel issue', 8),
  ('Drum noise', 9),
  ('Timer / cycle issue', 10)
) AS i(label, ord)
WHERE p.product_name = 'Washing Machine';

-- Seed: Default products

INSERT INTO products (id, category, product_name, display_order) VALUES
  (gen_random_uuid(), 'electronics', 'Phone', 1),
  (gen_random_uuid(), 'electronics', 'Laptop', 2),
  (gen_random_uuid(), 'electronics', 'Tablet', 3),
  (gen_random_uuid(), 'electronics', 'Desktop', 4),
  (gen_random_uuid(), 'appliances', 'TV', 5),
  (gen_random_uuid(), 'appliances', 'AC', 6),
  (gen_random_uuid(), 'appliances', 'Fridge', 7),
  (gen_random_uuid(), 'appliances', 'Washing Machine', 8),
  (gen_random_uuid(), 'appliances', 'Microwave', 9),
  (gen_random_uuid(), 'appliances', 'Water Purifier', 10)
ON CONFLICT DO NOTHING;

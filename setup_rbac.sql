-- Setup Superadmin (Owner)
UPDATE users 
SET role = 'owner', is_active = true 
WHERE LOWER(email) = LOWER('visualdendy@gmail.com');

-- Create Staff account if it doesn't exist
INSERT INTO users (id, email, full_name, role, is_active, created_at, updated_at)
SELECT 
    gen_random_uuid(), 
    'staff1@gmail.com', 
    'Staff Kasir 1', 
    'cashier', 
    true, 
    NOW(), 
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'staff1@gmail.com');

-- Set Staff password (staff12345678 hashed)
-- Use this if you have the auth_passwords table
INSERT INTO auth_passwords (user_id, password_hash)
SELECT id, '$2a$10$rN8T5A1lXp8I6f/W6P5t2uqh6lXp1O6O6O6O6O6O6O6O6O6O6' -- Placeholder hash for 'staff12345678'
FROM users WHERE email = 'staff1@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET password_hash = EXCLUDED.password_hash;

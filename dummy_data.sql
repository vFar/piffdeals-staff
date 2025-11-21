-- ============================================
-- DUMMY DATA INSERT SCRIPT
-- ============================================
-- This script inserts 50 dummy users, 50 invoices with various statuses,
-- invoice items, and activity logs for testing purposes.
--
-- IMPORTANT: Invoices are created WITHOUT affecting Mozello stock
-- (product_id can be null or fake IDs, and statuses are varied)
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. INSERT 50 DUMMY USERS
-- ============================================
-- IMPORTANT: Users must be created FIRST using the Node.js script:
--   node create_dummy_auth_users.js
-- 
-- This script creates both auth users and user_profiles.
-- The SQL below is SKIPPED - users are created by the script.
-- 
-- All users have password: test1234
-- 
-- After running the script, proceed to section 2 (invoices) below.

-- User creation is handled by create_dummy_auth_users.js
-- DO NOT run the INSERT below - it will fail due to foreign key constraints
/*
INSERT INTO user_profiles (id, email, username, role, status, created_at) VALUES
-- Super Admins (5)
(gen_random_uuid(), 'superadmin1@test.com', 'superadmin1', 'super_admin', 'active', NOW() - INTERVAL '100 days'),
(gen_random_uuid(), 'superadmin2@test.com', 'superadmin2', 'super_admin', 'active', NOW() - INTERVAL '90 days'),
(gen_random_uuid(), 'superadmin3@test.com', 'superadmin3', 'super_admin', 'active', NOW() - INTERVAL '80 days'),
(gen_random_uuid(), 'superadmin4@test.com', 'superadmin4', 'super_admin', 'inactive', NOW() - INTERVAL '70 days'),
(gen_random_uuid(), 'superadmin5@test.com', 'superadmin5', 'super_admin', 'active', NOW() - INTERVAL '60 days'),

-- Admins (10)
(gen_random_uuid(), 'admin1@test.com', 'admin1', 'admin', 'active', NOW() - INTERVAL '95 days'),
(gen_random_uuid(), 'admin2@test.com', 'admin2', 'admin', 'active', NOW() - INTERVAL '85 days'),
(gen_random_uuid(), 'admin3@test.com', 'admin3', 'admin', 'active', NOW() - INTERVAL '75 days'),
(gen_random_uuid(), 'admin4@test.com', 'admin4', 'admin', 'inactive', NOW() - INTERVAL '65 days'),
(gen_random_uuid(), 'admin5@test.com', 'admin5', 'admin', 'active', NOW() - INTERVAL '55 days'),
(gen_random_uuid(), 'admin6@test.com', 'admin6', 'admin', 'suspended', NOW() - INTERVAL '45 days'),
(gen_random_uuid(), 'admin7@test.com', 'admin7', 'admin', 'active', NOW() - INTERVAL '35 days'),
(gen_random_uuid(), 'admin8@test.com', 'admin8', 'admin', 'active', NOW() - INTERVAL '25 days'),
(gen_random_uuid(), 'admin9@test.com', 'admin9', 'admin', 'inactive', NOW() - INTERVAL '15 days'),
(gen_random_uuid(), 'admin10@test.com', 'admin10', 'admin', 'active', NOW() - INTERVAL '5 days'),

-- Employees (35)
(gen_random_uuid(), 'employee1@test.com', 'employee1', 'employee', 'active', NOW() - INTERVAL '100 days'),
(gen_random_uuid(), 'employee2@test.com', 'employee2', 'employee', 'active', NOW() - INTERVAL '95 days'),
(gen_random_uuid(), 'employee3@test.com', 'employee3', 'employee', 'active', NOW() - INTERVAL '90 days'),
(gen_random_uuid(), 'employee4@test.com', 'employee4', 'employee', 'inactive', NOW() - INTERVAL '85 days'),
(gen_random_uuid(), 'employee5@test.com', 'employee5', 'employee', 'active', NOW() - INTERVAL '80 days'),
(gen_random_uuid(), 'employee6@test.com', 'employee6', 'employee', 'active', NOW() - INTERVAL '75 days'),
(gen_random_uuid(), 'employee7@test.com', 'employee7', 'employee', 'suspended', NOW() - INTERVAL '70 days'),
(gen_random_uuid(), 'employee8@test.com', 'employee8', 'employee', 'active', NOW() - INTERVAL '65 days'),
(gen_random_uuid(), 'employee9@test.com', 'employee9', 'employee', 'active', NOW() - INTERVAL '60 days'),
(gen_random_uuid(), 'employee10@test.com', 'employee10', 'employee', 'active', NOW() - INTERVAL '55 days'),
(gen_random_uuid(), 'employee11@test.com', 'employee11', 'employee', 'active', NOW() - INTERVAL '50 days'),
(gen_random_uuid(), 'employee12@test.com', 'employee12', 'employee', 'inactive', NOW() - INTERVAL '45 days'),
(gen_random_uuid(), 'employee13@test.com', 'employee13', 'employee', 'active', NOW() - INTERVAL '40 days'),
(gen_random_uuid(), 'employee14@test.com', 'employee14', 'employee', 'active', NOW() - INTERVAL '35 days'),
(gen_random_uuid(), 'employee15@test.com', 'employee15', 'employee', 'active', NOW() - INTERVAL '30 days'),
(gen_random_uuid(), 'employee16@test.com', 'employee16', 'employee', 'active', NOW() - INTERVAL '25 days'),
(gen_random_uuid(), 'employee17@test.com', 'employee17', 'employee', 'suspended', NOW() - INTERVAL '20 days'),
(gen_random_uuid(), 'employee18@test.com', 'employee18', 'employee', 'active', NOW() - INTERVAL '15 days'),
(gen_random_uuid(), 'employee19@test.com', 'employee19', 'employee', 'active', NOW() - INTERVAL '10 days'),
(gen_random_uuid(), 'employee20@test.com', 'employee20', 'employee', 'active', NOW() - INTERVAL '5 days'),
(gen_random_uuid(), 'employee21@test.com', 'employee21', 'employee', 'active', NOW() - INTERVAL '4 days'),
(gen_random_uuid(), 'employee22@test.com', 'employee22', 'employee', 'inactive', NOW() - INTERVAL '3 days'),
(gen_random_uuid(), 'employee23@test.com', 'employee23', 'employee', 'active', NOW() - INTERVAL '2 days'),
(gen_random_uuid(), 'employee24@test.com', 'employee24', 'employee', 'active', NOW() - INTERVAL '1 day'),
(gen_random_uuid(), 'employee25@test.com', 'employee25', 'employee', 'active', NOW()),
(gen_random_uuid(), 'employee26@test.com', 'employee26', 'employee', 'active', NOW() - INTERVAL '100 days'),
(gen_random_uuid(), 'employee27@test.com', 'employee27', 'employee', 'active', NOW() - INTERVAL '90 days'),
(gen_random_uuid(), 'employee28@test.com', 'employee28', 'employee', 'active', NOW() - INTERVAL '80 days'),
(gen_random_uuid(), 'employee29@test.com', 'employee29', 'employee', 'inactive', NOW() - INTERVAL '70 days'),
(gen_random_uuid(), 'employee30@test.com', 'employee30', 'employee', 'active', NOW() - INTERVAL '60 days'),
(gen_random_uuid(), 'employee31@test.com', 'employee31', 'employee', 'active', NOW() - INTERVAL '50 days'),
(gen_random_uuid(), 'employee32@test.com', 'employee32', 'employee', 'active', NOW() - INTERVAL '40 days'),
(gen_random_uuid(), 'employee33@test.com', 'employee33', 'employee', 'suspended', NOW() - INTERVAL '30 days'),
(gen_random_uuid(), 'employee34@test.com', 'employee34', 'employee', 'active', NOW() - INTERVAL '20 days'),
(gen_random_uuid(), 'employee35@test.com', 'employee35', 'employee', 'active', NOW() - INTERVAL '10 days');
*/

-- Store user IDs for later use (using a temporary approach)
-- We'll reference users by selecting them in the invoice inserts

-- ============================================
-- 2. INSERT 50 INVOICES WITH VARIOUS STATUSES
-- ============================================
-- Statuses: draft (10), sent (10), paid (10), pending (5), overdue (10), cancelled (5)
-- These invoices use fake product IDs or NULL to avoid affecting Mozello stock

DO $$
DECLARE
    user_ids UUID[];
    invoice_ids UUID[];
    i INTEGER;
    invoice_id UUID;
    user_id UUID;
    invoice_num INTEGER := 1;
    statuses TEXT[] := ARRAY['draft', 'draft', 'draft', 'draft', 'draft', 'draft', 'draft', 'draft', 'draft', 'draft',
                             'sent', 'sent', 'sent', 'sent', 'sent', 'sent', 'sent', 'sent', 'sent', 'sent',
                             'paid', 'paid', 'paid', 'paid', 'paid', 'paid', 'paid', 'paid', 'paid', 'paid',
                             'pending', 'pending', 'pending', 'pending', 'pending',
                             'overdue', 'overdue', 'overdue', 'overdue', 'overdue', 'overdue', 'overdue', 'overdue', 'overdue', 'overdue',
                             'cancelled', 'cancelled', 'cancelled', 'cancelled', 'cancelled'];
    status TEXT;
    customer_names TEXT[] := ARRAY['John Smith', 'Jane Doe', 'Robert Johnson', 'Emily Williams', 'Michael Brown',
                                    'Sarah Davis', 'David Miller', 'Lisa Wilson', 'James Moore', 'Patricia Taylor',
                                    'Richard Anderson', 'Jennifer Thomas', 'Charles Jackson', 'Linda White', 'Thomas Harris',
                                    'Barbara Martin', 'Christopher Thompson', 'Susan Garcia', 'Daniel Martinez', 'Jessica Robinson',
                                    'Matthew Clark', 'Karen Rodriguez', 'Anthony Lewis', 'Nancy Lee', 'Mark Walker',
                                    'Betty Hall', 'Donald Allen', 'Helen Young', 'Steven King', 'Sandra Wright',
                                    'Paul Lopez', 'Donna Hill', 'Andrew Scott', 'Carol Green', 'Joshua Adams',
                                    'Ruth Baker', 'Kevin Gonzalez', 'Sharon Nelson', 'Brian Carter', 'Michelle Mitchell',
                                    'George Perez', 'Laura Roberts', 'Edward Turner', 'Kimberly Phillips', 'Ronald Campbell',
                                    'Deborah Parker', 'Jason Evans', 'Amy Edwards', 'Ryan Collins', 'Angela Stewart'];
    customer_emails TEXT[] := ARRAY['john.smith@email.com', 'jane.doe@email.com', 'robert.j@email.com', 'emily.w@email.com', 'michael.b@email.com',
                                     'sarah.d@email.com', 'david.m@email.com', 'lisa.w@email.com', 'james.m@email.com', 'patricia.t@email.com',
                                     'richard.a@email.com', 'jennifer.t@email.com', 'charles.j@email.com', 'linda.w@email.com', 'thomas.h@email.com',
                                     'barbara.m@email.com', 'christopher.t@email.com', 'susan.g@email.com', 'daniel.m@email.com', 'jessica.r@email.com',
                                     'matthew.c@email.com', 'karen.r@email.com', 'anthony.l@email.com', 'nancy.l@email.com', 'mark.w@email.com',
                                     'betty.h@email.com', 'donald.a@email.com', 'helen.y@email.com', 'steven.k@email.com', 'sandra.w@email.com',
                                     'paul.l@email.com', 'donna.h@email.com', 'andrew.s@email.com', 'carol.g@email.com', 'joshua.a@email.com',
                                     'ruth.b@email.com', 'kevin.g@email.com', 'sharon.n@email.com', 'brian.c@email.com', 'michelle.m@email.com',
                                     'george.p@email.com', 'laura.r@email.com', 'edward.t@email.com', 'kimberly.p@email.com', 'ronald.c@email.com',
                                     'deborah.p@email.com', 'jason.e@email.com', 'amy.e@email.com', 'ryan.c@email.com', 'angela.s@email.com'];
    addresses TEXT[] := ARRAY['123 Main St, Riga, LV-1001', '456 Oak Ave, Riga, LV-1002', '789 Pine Rd, Riga, LV-1003',
                              '321 Elm St, Riga, LV-1004', '654 Maple Dr, Riga, LV-1005', '987 Cedar Ln, Riga, LV-1006',
                              '147 Birch Way, Riga, LV-1007', '258 Spruce Ct, Riga, LV-1008', '369 Willow St, Riga, LV-1009',
                              '741 Ash Ave, Riga, LV-1010', '852 Poplar Rd, Riga, LV-1011', '963 Cherry Dr, Riga, LV-1012',
                              '159 Apple Ln, Riga, LV-1013', '357 Orange Way, Riga, LV-1014', '468 Peach Ct, Riga, LV-1015',
                              '579 Berry St, Riga, LV-1016', '680 Grape Ave, Riga, LV-1017', '791 Plum Rd, Riga, LV-1018',
                              '802 Kiwi Dr, Riga, LV-1019', '913 Mango Ln, Riga, LV-1020', '124 Banana Way, Riga, LV-1021',
                              '235 Pineapple Ct, Riga, LV-1022', '346 Strawberry St, Riga, LV-1023', '457 Blueberry Ave, Riga, LV-1024',
                              '568 Raspberry Rd, Riga, LV-1025', '679 Blackberry Dr, Riga, LV-1026', '780 Cranberry Ln, Riga, LV-1027',
                              '891 Gooseberry Way, Riga, LV-1028', '902 Elderberry Ct, Riga, LV-1029', '013 Mulberry St, Riga, LV-1030',
                              '124 Currant Ave, Riga, LV-1031', '235 Date Rd, Riga, LV-1032', '346 Fig Dr, Riga, LV-1033',
                              '457 Grapefruit Ln, Riga, LV-1034', '568 Lemon Way, Riga, LV-1035', '679 Lime Ct, Riga, LV-1036',
                              '780 Tangerine St, Riga, LV-1037', '891 Clementine Ave, Riga, LV-1038', '902 Mandarin Rd, Riga, LV-1039',
                              '013 Kumquat Dr, Riga, LV-1040', '124 Pomelo Ln, Riga, LV-1041', '235 Yuzu Way, Riga, LV-1042',
                              '346 Bergamot Ct, Riga, LV-1043', '457 Citron St, Riga, LV-1044', '568 Calamansi Ave, Riga, LV-1045',
                              '679 Finger Lime Rd, Riga, LV-1046', '780 Blood Orange Dr, Riga, LV-1047', '891 Navel Orange Ln, Riga, LV-1048',
                              '902 Valencia Orange Way, Riga, LV-1049', '013 Seville Orange Ct, Riga, LV-1050'];
    phones TEXT[] := ARRAY['+371 20000001', '+371 20000002', '+371 20000003', '+371 20000004', '+371 20000005',
                           '+371 20000006', '+371 20000007', '+371 20000008', '+371 20000009', '+371 20000010',
                           '+371 20000011', '+371 20000012', '+371 20000013', '+371 20000014', '+371 20000015',
                           '+371 20000016', '+371 20000017', '+371 20000018', '+371 20000019', '+371 20000020',
                           '+371 20000021', '+371 20000022', '+371 20000023', '+371 20000024', '+371 20000025',
                           '+371 20000026', '+371 20000027', '+371 20000028', '+371 20000029', '+371 20000030',
                           '+371 20000031', '+371 20000032', '+371 20000033', '+371 20000034', '+371 20000035',
                           '+371 20000036', '+371 20000037', '+371 20000038', '+371 20000039', '+371 20000040',
                           '+371 20000041', '+371 20000042', '+371 20000043', '+371 20000044', '+371 20000045',
                           '+371 20000046', '+371 20000047', '+371 20000048', '+371 20000049', '+371 20000050'];
    product_names TEXT[] := ARRAY['Premium Product A', 'Standard Product B', 'Deluxe Product C', 'Basic Product D', 'Pro Product E',
                                  'Ultra Product F', 'Mega Product G', 'Super Product H', 'Elite Product I', 'Classic Product J',
                                  'Modern Product K', 'Vintage Product L', 'New Product M', 'Best Product N', 'Top Product O',
                                  'Quality Product P', 'Value Product Q', 'Premium Plus R', 'Standard Plus S', 'Deluxe Plus T'];
    subtotal_val NUMERIC;
    tax_amount_val NUMERIC;
    total_val NUMERIC;
    issue_date_val DATE;
    due_date_val DATE;
    paid_date_val DATE;
BEGIN
    -- Get all user IDs (employees and admins who can create invoices)
    SELECT ARRAY_AGG(id ORDER BY created_at) INTO user_ids
    FROM user_profiles
    WHERE role IN ('employee', 'admin', 'super_admin');

    -- Create 50 invoices
    FOR i IN 1..50 LOOP
        -- Select a random user
        user_id := user_ids[1 + (i - 1) % array_length(user_ids, 1)];
        status := statuses[i];
        
        -- Generate invoice number
        invoice_id := gen_random_uuid();
        invoice_ids[i] := invoice_id;
        
        -- Calculate dates based on status
        issue_date_val := CURRENT_DATE - (i * 2);
        due_date_val := issue_date_val + INTERVAL '30 days';
        
        -- Set paid_date for paid invoices
        IF status = 'paid' THEN
            paid_date_val := issue_date_val + INTERVAL '15 days';
        ELSE
            paid_date_val := NULL;
        END IF;
        
        -- Adjust dates for overdue invoices
        IF status = 'overdue' THEN
            due_date_val := CURRENT_DATE - INTERVAL '10 days';
        END IF;
        
        -- Calculate random totals (will be updated after items are inserted)
        subtotal_val := 50.00 + (RANDOM() * 950.00); -- Between 50 and 1000
        tax_amount_val := subtotal_val * 0.21; -- 21% VAT
        total_val := subtotal_val + tax_amount_val;
        
        -- Insert invoice (totals will be recalculated after items)
        INSERT INTO invoices (
            id, invoice_number, user_id, customer_name, customer_email, customer_address, customer_phone,
            issue_date, due_date, paid_date, subtotal, tax_rate, tax_amount, total, status, notes, public_token, created_at, updated_at
        ) VALUES (
            invoice_id,
            'INV-' || LPAD(invoice_num::TEXT, 6, '0'),
            user_id,
            customer_names[i],
            customer_emails[i],
            addresses[i],
            phones[i],
            issue_date_val,
            due_date_val,
            paid_date_val,
            subtotal_val,
            21.00,
            tax_amount_val,
            total_val,
            status,
            CASE WHEN i % 3 = 0 THEN 'Test invoice notes ' || i ELSE NULL END,
            gen_random_uuid(),
            issue_date_val,
            issue_date_val
        );
        
        invoice_num := invoice_num + 1;
    END LOOP;
    
    -- Now create invoice items for each invoice and recalculate totals
    FOR i IN 1..50 LOOP
        invoice_id := invoice_ids[i];
        subtotal_val := 0;
        
        -- Each invoice gets 1-5 items
        FOR j IN 1..(1 + (i % 5)) LOOP
            DECLARE
                item_total NUMERIC;
                item_quantity INTEGER;
                item_unit_price NUMERIC;
            BEGIN
                item_quantity := 1 + (j % 5); -- Quantity between 1 and 5
                item_unit_price := 10.00 + (RANDOM() * 200.00); -- Between 10 and 210
                item_total := item_unit_price * item_quantity;
                subtotal_val := subtotal_val + item_total;
                
                INSERT INTO invoice_items (
                    id, invoice_id, product_id, product_name, quantity, unit_price, total
                ) VALUES (
                    gen_random_uuid(),
                    invoice_id,
                    NULL, -- NULL product_id to avoid affecting Mozello stock
                    product_names[1 + (j - 1) % array_length(product_names, 1)] || ' - Item ' || j,
                    item_quantity,
                    item_unit_price,
                    item_total
                );
            END;
        END LOOP;
        
        -- Recalculate invoice totals based on items
        tax_amount_val := subtotal_val * 0.21; -- 21% VAT
        total_val := subtotal_val + tax_amount_val;
        
        -- Update invoice with correct totals
        UPDATE invoices
        SET subtotal = subtotal_val,
            tax_amount = tax_amount_val,
            total = total_val
        WHERE id = invoice_id;
    END LOOP;
END $$;

-- ============================================
-- 3. INSERT ACTIVITY LOGS
-- ============================================
-- Create various activity logs for users, invoices, and system events

DO $$
DECLARE
    user_ids UUID[];
    invoice_ids UUID[];
    i INTEGER;
    user_id UUID;
    invoice_id UUID;
    action_types TEXT[] := ARRAY['user_created', 'user_updated', 'invoice_created', 'invoice_sent', 'invoice_paid',
                                 'invoice_updated', 'login', 'logout', 'password_changed', 'invoice_status_changed'];
    action_categories TEXT[] := ARRAY['user_management', 'invoice_management', 'system', 'security'];
    descriptions TEXT[];
BEGIN
    -- Get user IDs
    SELECT ARRAY_AGG(id ORDER BY created_at) INTO user_ids
    FROM user_profiles;
    
    -- Get invoice IDs
    SELECT ARRAY_AGG(id ORDER BY created_at) INTO invoice_ids
    FROM invoices;
    
    -- Create 50 activity logs
    FOR i IN 1..50 LOOP
        user_id := user_ids[1 + (i - 1) % array_length(user_ids, 1)];
        
        -- Get user details for the log
        DECLARE
            user_email TEXT;
            user_username TEXT;
            user_role TEXT;
            action_type TEXT;
            action_category TEXT;
            description TEXT;
            target_id_val UUID;
            target_type_val TEXT;
        BEGIN
            SELECT email, username, role INTO user_email, user_username, user_role
            FROM user_profiles
            WHERE id = user_id;
            
            -- Determine action type and category
            IF i <= 10 THEN
                action_type := 'user_created';
                action_category := 'user_management';
                description := 'Created new user account: ' || user_username;
                target_id_val := user_id;
                target_type_val := 'user';
            ELSIF i <= 20 THEN
                action_type := 'invoice_created';
                action_category := 'invoice_management';
                invoice_id := invoice_ids[1 + (i - 11) % array_length(invoice_ids, 1)];
                description := 'Created new invoice: INV-' || LPAD((i - 10)::TEXT, 6, '0');
                target_id_val := invoice_id;
                target_type_val := 'invoice';
            ELSIF i <= 30 THEN
                action_type := 'invoice_sent';
                action_category := 'invoice_management';
                invoice_id := invoice_ids[1 + (i - 21) % array_length(invoice_ids, 1)];
                description := 'Sent invoice to client: INV-' || LPAD((i - 20)::TEXT, 6, '0');
                target_id_val := invoice_id;
                target_type_val := 'invoice';
            ELSIF i <= 35 THEN
                action_type := 'invoice_paid';
                action_category := 'invoice_management';
                invoice_id := invoice_ids[1 + (i - 31) % array_length(invoice_ids, 1)];
                description := 'Marked invoice as paid: INV-' || LPAD((i - 30)::TEXT, 6, '0');
                target_id_val := invoice_id;
                target_type_val := 'invoice';
            ELSIF i <= 40 THEN
                action_type := 'login';
                action_category := 'system';
                description := 'User logged into system';
                target_id_val := user_id;
                target_type_val := 'user';
            ELSIF i <= 45 THEN
                action_type := 'user_updated';
                action_category := 'user_management';
                description := 'Updated user account: ' || user_username;
                target_id_val := user_id;
                target_type_val := 'user';
            ELSE
                action_type := 'password_changed';
                action_category := 'security';
                description := 'User changed password';
                target_id_val := user_id;
                target_type_val := 'user';
            END IF;
            
            -- Insert activity log
            INSERT INTO activity_logs (
                id, user_id, user_username, user_email, user_role,
                action_type, action_category, description,
                target_type, target_id,
                ip_address, user_agent, created_at
            ) VALUES (
                gen_random_uuid(),
                user_id,
                user_username,
                user_email,
                user_role,
                action_type,
                action_category,
                description,
                target_type_val,
                target_id_val,
                '192.168.1.' || (100 + (i % 155)),
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                NOW() - (i * INTERVAL '1 day')
            );
        END;
    END LOOP;
END $$;

-- ============================================
-- SUMMARY
-- ============================================
-- This script has inserted:
-- - 50 users (5 super_admins, 10 admins, 35 employees)
-- - 50 invoices with various statuses:
--   * 10 drafts
--   * 10 sent
--   * 10 paid
--   * 5 pending
--   * 10 overdue
--   * 5 cancelled
-- - Multiple invoice items (1-5 items per invoice)
-- - 50 activity logs
--
-- All invoices use NULL product_id to avoid affecting Mozello stock
-- ============================================


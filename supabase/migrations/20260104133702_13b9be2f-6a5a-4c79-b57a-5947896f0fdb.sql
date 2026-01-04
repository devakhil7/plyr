-- Insert test users into auth.users and trigger profile creation
-- Password for all users: TestPassword123!

INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  aud,
  role
)
VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'aarav.mehta@sportsiq.com', crypt('TestPassword123!', gen_salt('bf')), now(), '{"name": "Aarav Mehta"}'::jsonb, now(), now(), '', '', '', '', 'authenticated', 'authenticated'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'rohan.iyer@sportsiq.com', crypt('TestPassword123!', gen_salt('bf')), now(), '{"name": "Rohan Iyer"}'::jsonb, now(), now(), '', '', '', '', 'authenticated', 'authenticated'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'kunal.verma@sportsiq.com', crypt('TestPassword123!', gen_salt('bf')), now(), '{"name": "Kunal Verma"}'::jsonb, now(), now(), '', '', '', '', 'authenticated', 'authenticated'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'siddharth.rao@sportsiq.com', crypt('TestPassword123!', gen_salt('bf')), now(), '{"name": "Siddharth Rao"}'::jsonb, now(), now(), '', '', '', '', 'authenticated', 'authenticated'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'arjun.malhotra@sportsiq.com', crypt('TestPassword123!', gen_salt('bf')), now(), '{"name": "Arjun Malhotra"}'::jsonb, now(), now(), '', '', '', '', 'authenticated', 'authenticated'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'aditya.kulkarni@sportsiq.com', crypt('TestPassword123!', gen_salt('bf')), now(), '{"name": "Aditya Kulkarni"}'::jsonb, now(), now(), '', '', '', '', 'authenticated', 'authenticated'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'nikhil.sharma@sportsiq.com', crypt('TestPassword123!', gen_salt('bf')), now(), '{"name": "Nikhil Sharma"}'::jsonb, now(), now(), '', '', '', '', 'authenticated', 'authenticated'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'pranav.joshi@sportsiq.com', crypt('TestPassword123!', gen_salt('bf')), now(), '{"name": "Pranav Joshi"}'::jsonb, now(), now(), '', '', '', '', 'authenticated', 'authenticated'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'varun.chatterjee@sportsiq.com', crypt('TestPassword123!', gen_salt('bf')), now(), '{"name": "Varun Chatterjee"}'::jsonb, now(), now(), '', '', '', '', 'authenticated', 'authenticated'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'abhishek.nair@sportsiq.com', crypt('TestPassword123!', gen_salt('bf')), now(), '{"name": "Abhishek Nair"}'::jsonb, now(), now(), '', '', '', '', 'authenticated', 'authenticated'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'rahul.sengupta@sportsiq.com', crypt('TestPassword123!', gen_salt('bf')), now(), '{"name": "Rahul Sengupta"}'::jsonb, now(), now(), '', '', '', '', 'authenticated', 'authenticated'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'aman.gupta@sportsiq.com', crypt('TestPassword123!', gen_salt('bf')), now(), '{"name": "Aman Gupta"}'::jsonb, now(), now(), '', '', '', '', 'authenticated', 'authenticated'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'saurabh.mishra@sportsiq.com', crypt('TestPassword123!', gen_salt('bf')), now(), '{"name": "Saurabh Mishra"}'::jsonb, now(), now(), '', '', '', '', 'authenticated', 'authenticated'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'yash.patel@sportsiq.com', crypt('TestPassword123!', gen_salt('bf')), now(), '{"name": "Yash Patel"}'::jsonb, now(), now(), '', '', '', '', 'authenticated', 'authenticated'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'deepak.reddy@sportsiq.com', crypt('TestPassword123!', gen_salt('bf')), now(), '{"name": "Deepak Reddy"}'::jsonb, now(), now(), '', '', '', '', 'authenticated', 'authenticated'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'mohit.bansal@sportsiq.com', crypt('TestPassword123!', gen_salt('bf')), now(), '{"name": "Mohit Bansal"}'::jsonb, now(), now(), '', '', '', '', 'authenticated', 'authenticated'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'akash.pillai@sportsiq.com', crypt('TestPassword123!', gen_salt('bf')), now(), '{"name": "Akash Pillai"}'::jsonb, now(), now(), '', '', '', '', 'authenticated', 'authenticated'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'shreyas.deshpande@sportsiq.com', crypt('TestPassword123!', gen_salt('bf')), now(), '{"name": "Shreyas Deshpande"}'::jsonb, now(), now(), '', '', '', '', 'authenticated', 'authenticated'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'karthik.subramanian@sportsiq.com', crypt('TestPassword123!', gen_salt('bf')), now(), '{"name": "Karthik Subramanian"}'::jsonb, now(), now(), '', '', '', '', 'authenticated', 'authenticated'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'ritesh.jain@sportsiq.com', crypt('TestPassword123!', gen_salt('bf')), now(), '{"name": "Ritesh Jain"}'::jsonb, now(), now(), '', '', '', '', 'authenticated', 'authenticated'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'vinayak.sawant@sportsiq.com', crypt('TestPassword123!', gen_salt('bf')), now(), '{"name": "Vinayak Sawant"}'::jsonb, now(), now(), '', '', '', '', 'authenticated', 'authenticated'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'harsh.vardhan@sportsiq.com', crypt('TestPassword123!', gen_salt('bf')), now(), '{"name": "Harsh Vardhan"}'::jsonb, now(), now(), '', '', '', '', 'authenticated', 'authenticated'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'manish.thakur@sportsiq.com', crypt('TestPassword123!', gen_salt('bf')), now(), '{"name": "Manish Thakur"}'::jsonb, now(), now(), '', '', '', '', 'authenticated', 'authenticated'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'ankit.srivastava@sportsiq.com', crypt('TestPassword123!', gen_salt('bf')), now(), '{"name": "Ankit Srivastava"}'::jsonb, now(), now(), '', '', '', '', 'authenticated', 'authenticated'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'raghav.khanna@sportsiq.com', crypt('TestPassword123!', gen_salt('bf')), now(), '{"name": "Raghav Khanna"}'::jsonb, now(), now(), '', '', '', '', 'authenticated', 'authenticated');

-- Update the phone numbers for the created profiles
UPDATE public.profiles SET phone_number = '+91 9000010001', profile_completed = true WHERE email = 'aarav.mehta@sportsiq.com';
UPDATE public.profiles SET phone_number = '+91 9000010002', profile_completed = true WHERE email = 'rohan.iyer@sportsiq.com';
UPDATE public.profiles SET phone_number = '+91 9000010003', profile_completed = true WHERE email = 'kunal.verma@sportsiq.com';
UPDATE public.profiles SET phone_number = '+91 9000010004', profile_completed = true WHERE email = 'siddharth.rao@sportsiq.com';
UPDATE public.profiles SET phone_number = '+91 9000010005', profile_completed = true WHERE email = 'arjun.malhotra@sportsiq.com';
UPDATE public.profiles SET phone_number = '+91 9000010006', profile_completed = true WHERE email = 'aditya.kulkarni@sportsiq.com';
UPDATE public.profiles SET phone_number = '+91 9000010007', profile_completed = true WHERE email = 'nikhil.sharma@sportsiq.com';
UPDATE public.profiles SET phone_number = '+91 9000010008', profile_completed = true WHERE email = 'pranav.joshi@sportsiq.com';
UPDATE public.profiles SET phone_number = '+91 9000010009', profile_completed = true WHERE email = 'varun.chatterjee@sportsiq.com';
UPDATE public.profiles SET phone_number = '+91 9000010010', profile_completed = true WHERE email = 'abhishek.nair@sportsiq.com';
UPDATE public.profiles SET phone_number = '+91 9000010011', profile_completed = true WHERE email = 'rahul.sengupta@sportsiq.com';
UPDATE public.profiles SET phone_number = '+91 9000010012', profile_completed = true WHERE email = 'aman.gupta@sportsiq.com';
UPDATE public.profiles SET phone_number = '+91 9000010013', profile_completed = true WHERE email = 'saurabh.mishra@sportsiq.com';
UPDATE public.profiles SET phone_number = '+91 9000010014', profile_completed = true WHERE email = 'yash.patel@sportsiq.com';
UPDATE public.profiles SET phone_number = '+91 9000010015', profile_completed = true WHERE email = 'deepak.reddy@sportsiq.com';
UPDATE public.profiles SET phone_number = '+91 9000010016', profile_completed = true WHERE email = 'mohit.bansal@sportsiq.com';
UPDATE public.profiles SET phone_number = '+91 9000010017', profile_completed = true WHERE email = 'akash.pillai@sportsiq.com';
UPDATE public.profiles SET phone_number = '+91 9000010018', profile_completed = true WHERE email = 'shreyas.deshpande@sportsiq.com';
UPDATE public.profiles SET phone_number = '+91 9000010019', profile_completed = true WHERE email = 'karthik.subramanian@sportsiq.com';
UPDATE public.profiles SET phone_number = '+91 9000010020', profile_completed = true WHERE email = 'ritesh.jain@sportsiq.com';
UPDATE public.profiles SET phone_number = '+91 9000010021', profile_completed = true WHERE email = 'vinayak.sawant@sportsiq.com';
UPDATE public.profiles SET phone_number = '+91 9000010022', profile_completed = true WHERE email = 'harsh.vardhan@sportsiq.com';
UPDATE public.profiles SET phone_number = '+91 9000010023', profile_completed = true WHERE email = 'manish.thakur@sportsiq.com';
UPDATE public.profiles SET phone_number = '+91 9000010024', profile_completed = true WHERE email = 'ankit.srivastava@sportsiq.com';
UPDATE public.profiles SET phone_number = '+91 9000010025', profile_completed = true WHERE email = 'raghav.khanna@sportsiq.com';
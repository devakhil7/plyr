DO $$
DECLARE
  turf_uuid uuid := '732e8d05-026d-4fb1-8df1-8db2f2c8a9d8';
  akhil_id uuid := '5788d38c-6668-4db3-a38b-1674f9dc3566';
  john_id uuid := 'ddd150ee-2737-44ba-a303-14701af90a3e';
  other_user_ids uuid[] := ARRAY[
    '1d350bdf-008d-4d92-a862-a985a41303d0',
    '69ddffe3-9730-4e89-afdb-8bba11eaede5',
    '48b2d625-612a-4612-aeb4-851f91484f32',
    '5ee1ae58-87d5-4d74-a458-38d583f4cd31',
    '9556767a-8815-473f-9b0a-d641f978ed72',
    '3176b2eb-b3ec-4d0a-b326-8accdb95cef0',
    'e3250c4e-1e5d-4b4e-b2a4-1c70f2bf7251',
    '192ae582-baea-4f1a-a7db-43a66b8908d0',
    'b7fe36ef-51d8-4bc2-a9a8-508268b44acf',
    '1bb67fde-810b-4ab6-827e-e053dba8a2ea',
    '63c470e5-2db6-44b0-b4ca-ca18f41e09b9',
    '6053cc63-9a01-4bcf-b5eb-b17183f1cbc0',
    '0431a09d-ae95-45b5-9f98-cc67a9e579d2',
    '62cab907-e4dd-4fec-a03c-d80f87b881f9',
    'd9b51d92-64bd-4186-8ce1-5fc962c4d5ae',
    'f41fa254-67e2-4ed7-b913-2519d61afc1b',
    'c46c0866-424f-40c2-9dcf-ef7a6b3c0aff',
    'b916da22-7f70-499e-9dde-9aaf9702259a',
    '38bbba83-2962-46e8-a284-4f6f484c2680',
    'b6ed062a-69bb-4375-8676-af560d4f85bf'
  ];
  match_names text[] := ARRAY[
    'Akhil & John Showdown', 'Friday Night Lights', 'Legends Face-Off', 
    'Weekend Warriors Classic', 'The Ultimate Match'
  ];
  match_uuid uuid;
  shuffled_users uuid[];
  player_uuid uuid;
  i int;
  j int;
  match_day date;
  match_hour time;
  team_a_goals int;
  team_b_goals int;
BEGIN
  FOR i IN 1..5 LOOP
    match_day := CURRENT_DATE - (5 + (random() * 25)::int);
    match_hour := ('18:00:00'::time + (random() * 3 * 60 || ' minutes')::interval)::time;
    team_a_goals := floor(random() * 5)::int;
    team_b_goals := floor(random() * 5)::int;
    
    -- Alternate host between Akhil and John
    INSERT INTO matches (
      id, host_id, match_name, sport, turf_id, match_date, match_time,
      duration_minutes, visibility, required_skill_min, required_skill_max,
      total_slots, status, team_assignment_mode, team_a_score, team_b_score
    ) VALUES (
      gen_random_uuid(), 
      CASE WHEN i % 2 = 1 THEN akhil_id ELSE john_id END,
      match_names[i], 'Football', turf_uuid,
      match_day, match_hour, 60, 'public', 'beginner', 'advanced',
      12, 'completed', 'auto', team_a_goals, team_b_goals
    ) RETURNING id INTO match_uuid;
    
    -- Shuffle other users
    shuffled_users := ARRAY(SELECT unnest(other_user_ids) ORDER BY random());
    
    -- Add Akhil to Team A
    INSERT INTO match_players (match_id, user_id, team, role, join_status)
    VALUES (match_uuid, akhil_id, 'A'::team_type, 'player'::player_role, 'confirmed'::join_status);
    
    -- Add John to Team B
    INSERT INTO match_players (match_id, user_id, team, role, join_status)
    VALUES (match_uuid, john_id, 'B'::team_type, 'player'::player_role, 'confirmed'::join_status);
    
    -- Add 5 more players to Team A (total 6)
    FOR j IN 1..5 LOOP
      player_uuid := shuffled_users[j];
      INSERT INTO match_players (match_id, user_id, team, role, join_status)
      VALUES (match_uuid, player_uuid, 'A'::team_type, 'player'::player_role, 'confirmed'::join_status)
      ON CONFLICT DO NOTHING;
    END LOOP;
    
    -- Add 5 more players to Team B (total 6)
    FOR j IN 6..10 LOOP
      player_uuid := shuffled_users[j];
      INSERT INTO match_players (match_id, user_id, team, role, join_status)
      VALUES (match_uuid, player_uuid, 'B'::team_type, 'player'::player_role, 'confirmed'::join_status)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;
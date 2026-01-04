-- Populate realistic player ratings for all completed matches
-- All ratings (including skills) must be 1-5

DO $$
DECLARE
  top_performers uuid[] := ARRAY[
    '5788d38c-6668-4db3-a38b-1674f9dc3566', -- Akhil
    'ddd150ee-2737-44ba-a303-14701af90a3e', -- John
    '1d350bdf-008d-4d92-a862-a985a41303d0', -- Aarav Mehta
    'e3250c4e-1e5d-4b4e-b2a4-1c70f2bf7251', -- Arjun Malhotra
    '63c470e5-2db6-44b0-b4ca-ca18f41e09b9'  -- Kunal Verma
  ];
  
  mid_performers uuid[] := ARRAY[
    '69ddffe3-9730-4e89-afdb-8bba11eaede5',
    '48b2d625-612a-4612-aeb4-851f91484f32',
    '5ee1ae58-87d5-4d74-a458-38d583f4cd31',
    '9556767a-8815-473f-9b0a-d641f978ed72',
    '3176b2eb-b3ec-4d0a-b326-8accdb95cef0',
    '192ae582-baea-4f1a-a7db-43a66b8908d0',
    'b7fe36ef-51d8-4bc2-a9a8-508268b44acf',
    '1bb67fde-810b-4ab6-827e-e053dba8a2ea',
    '6053cc63-9a01-4bcf-b5eb-b17183f1cbc0',
    '38bbba83-2962-46e8-a284-4f6f484c2680'
  ];

  match_rec RECORD;
  player_rec RECORD;
  rater_rec RECORD;
  base_rating int;
  skill_rating int;
  comments text[] := ARRAY[
    'Great game!', 'Solid performance', 'Keep it up!', 'Well played',
    'Good effort', 'Nice teamwork', 'Excellent skills', 'Fun to play with',
    'Strong defender', 'Clinical finisher', 'Great passing', 'Fast and agile',
    'Good positioning', 'Reliable player', 'Showed improvement', NULL, NULL, NULL
  ];
BEGIN
  FOR match_rec IN 
    SELECT m.id as match_id FROM matches m WHERE m.status = 'completed'
  LOOP
    FOR player_rec IN 
      SELECT mp.user_id FROM match_players mp 
      WHERE mp.match_id = match_rec.match_id 
        AND mp.user_id IS NOT NULL AND mp.join_status = 'confirmed'
    LOOP
      FOR rater_rec IN 
        SELECT mp.user_id FROM match_players mp 
        WHERE mp.match_id = match_rec.match_id 
          AND mp.user_id IS NOT NULL
          AND mp.user_id != player_rec.user_id
          AND mp.join_status = 'confirmed'
        ORDER BY random()
        LIMIT (3 + floor(random() * 3)::int)
      LOOP
        -- Determine base rating based on performer tier (all 1-5 scale)
        IF player_rec.user_id = ANY(top_performers) THEN
          base_rating := 4 + floor(random() * 2)::int; -- 4-5
        ELSIF player_rec.user_id = ANY(mid_performers) THEN
          base_rating := 3 + floor(random() * 2)::int; -- 3-4
        ELSE
          base_rating := 2 + floor(random() * 2)::int; -- 2-3
        END IF;
        
        -- Skill rating with slight variance (1-5 scale)
        skill_rating := LEAST(5, GREATEST(1, base_rating + (floor(random() * 2) - 1)::int));
        
        INSERT INTO player_ratings (
          id, match_id, rater_user_id, rated_user_id, 
          rating, comment,
          passing, shooting, dribbling, ball_control, finishing, defending, pace
        ) VALUES (
          gen_random_uuid(),
          match_rec.match_id,
          rater_rec.user_id,
          player_rec.user_id,
          base_rating,
          comments[1 + floor(random() * array_length(comments, 1))::int],
          LEAST(5, GREATEST(1, skill_rating + (floor(random() * 3) - 1)::int)),
          LEAST(5, GREATEST(1, skill_rating + (floor(random() * 3) - 1)::int)),
          LEAST(5, GREATEST(1, skill_rating + (floor(random() * 3) - 1)::int)),
          LEAST(5, GREATEST(1, skill_rating + (floor(random() * 3) - 1)::int)),
          LEAST(5, GREATEST(1, skill_rating + (floor(random() * 3) - 1)::int)),
          LEAST(5, GREATEST(1, skill_rating + (floor(random() * 3) - 1)::int)),
          LEAST(5, GREATEST(1, skill_rating + (floor(random() * 3) - 1)::int))
        )
        ON CONFLICT DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;
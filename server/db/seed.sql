-- =====================================================================
--  Vapor — sample data
--  All seeded users have the password:  password123
--  Prices are illustrative sample data, not live store prices.
-- =====================================================================

-- ---------- users ----------
INSERT INTO users (username, email, password_hash, display_name, country, bio, wallet_balance, is_admin) VALUES
('admin',     'admin@vapor.dev',  '$2b$10$LMr1GaiV1pbeIHRKurRY1.IJE/BjJMvrtlfbBWBRFqX21ykrbr4lu', 'Vapor Admin',   'US', 'Store administrator.', 500.00, TRUE),
('abhishek',  'abhishek@vapor.dev', '$2b$10$LMr1GaiV1pbeIHRKurRY1.IJE/BjJMvrtlfbBWBRFqX21ykrbr4lu', 'Abhishek',      'US', 'Roguelike enjoyer and factory builder.', 120.00, FALSE),
('pixelpaz',  'paz@vapor.dev',    '$2b$10$LMr1GaiV1pbeIHRKurRY1.IJE/BjJMvrtlfbBWBRFqX21ykrbr4lu', 'PixelPaz',      'CA', 'Cozy games only.', 45.50, FALSE),
('frag_lord', 'frag@vapor.dev',   '$2b$10$LMr1GaiV1pbeIHRKurRY1.IJE/BjJMvrtlfbBWBRFqX21ykrbr4lu', 'Frag Lord',     'GB', 'Souls-likes and shooters.', 15.00, FALSE),
('mika_n',    'mika@vapor.dev',   '$2b$10$LMr1GaiV1pbeIHRKurRY1.IJE/BjJMvrtlfbBWBRFqX21ykrbr4lu', 'Mika',          'JP', 'Factory must grow.', 80.00, FALSE);

-- backdate sign-up dates so profiles look lived-in
UPDATE users SET created_at = NOW() - (CASE username
    WHEN 'admin' THEN INTERVAL '900 days' WHEN 'abhishek' THEN INTERVAL '640 days'
    WHEN 'pixelpaz' THEN INTERVAL '420 days' WHEN 'frag_lord' THEN INTERVAL '300 days'
    ELSE INTERVAL '150 days' END);

-- ---------- developers ----------
INSERT INTO developers (name, country, founded_year, website) VALUES
('Supergiant Games',  'United States', 2009, 'https://www.supergiantgames.com'),
('ConcernedApe',      'United States', 2011, 'https://www.stardewvalley.net'),
('Team Cherry',       'Australia',     2014, 'https://www.teamcherry.com.au'),
('Re-Logic',          'United States', 2011, 'https://re-logic.com'),
('Valve',             'United States', 1996, 'https://www.valvesoftware.com'),
('Larian Studios',    'Belgium',       1996, 'https://larian.com'),
('FromSoftware',      'Japan',         1986, 'https://www.fromsoftware.jp'),
('CD Projekt Red',    'Poland',        2002, 'https://www.cdprojektred.com'),
('Wube Software',     'Czech Republic',2014, 'https://factorio.com'),
('Ludeon Studios',    'Canada',        2013, 'https://ludeon.com'),
('Mega Crit',         'United States', 2016, 'https://www.megacrit.com'),
('Mobius Digital',    'United States', 2013, 'https://www.mobiusdigitalgames.com'),
('poncle',            'United Kingdom',2021, 'https://poncle.games'),
('Iron Gate',         'Sweden',        2018, 'https://irongatestudio.se'),
('Maddy Makes Games', 'Canada',        2015, 'https://exok.com');

-- ---------- publishers ----------
INSERT INTO publishers (name, country, website) VALUES
('Supergiant Games',      'United States', 'https://www.supergiantgames.com'),
('ConcernedApe',          'United States', 'https://www.stardewvalley.net'),
('Team Cherry',           'Australia',     'https://www.teamcherry.com.au'),
('Re-Logic',              'United States', 'https://re-logic.com'),
('Valve',                 'United States', 'https://www.valvesoftware.com'),
('Larian Studios',        'Belgium',       'https://larian.com'),
('Bandai Namco',          'Japan',         'https://www.bandainamcoent.com'),
('CD Projekt',            'Poland',        'https://www.cdprojekt.com'),
('Wube Software',         'Czech Republic','https://factorio.com'),
('Ludeon Studios',        'Canada',        'https://ludeon.com'),
('Humble Games',          'United States', 'https://www.humblegames.com'),
('Annapurna Interactive', 'United States', 'https://annapurnainteractive.com'),
('poncle',                'United Kingdom','https://poncle.games'),
('Coffee Stain Publishing','Sweden',       'https://www.coffeestainpublishing.com'),
('Maddy Makes Games',     'Canada',        'https://exok.com');

-- ---------- genres & platforms ----------
INSERT INTO genres (name) VALUES
('Action'),('Adventure'),('RPG'),('Strategy'),('Simulation'),('Indie'),
('Roguelike'),('Platformer'),('Puzzle'),('Survival'),('Open World'),('Casual'),('Sandbox');

INSERT INTO platforms (name) VALUES ('Windows'),('macOS'),('Linux');

-- ---------- games ----------
INSERT INTO games (title, short_description, description, price, discount_percent, release_date, age_rating, developer_id, publisher_id, cover_color) VALUES
('Hades', 'Battle out of the Underworld in this rogue-like dungeon crawler from the creators of Bastion.',
 'Defy the god of the dead as you hack and slash your way out of the Underworld. Each escape attempt is different, and the gods of Olympus lend you their boons along the way.',
 24.99, 50, '2020-09-17', 'T', 1, 1, '#8a1c1c'),
('Stardew Valley', 'Inherit your grandfather''s old farm plot and start a new life in the countryside.',
 'Grow crops, raise animals, fish, mine, and befriend the townsfolk of Pelican Town. Play solo or with up to three friends in co-op.',
 14.99, 0, '2016-02-26', 'E10+', 2, 2, '#3b7d3a'),
('Hollow Knight', 'Forge your own path through a vast, ruined kingdom of insects and heroes.',
 'A hand-drawn action-adventure through Hallownest. Explore twisting caverns, battle tainted creatures and uncover ancient secrets.',
 14.99, 0, '2017-02-24', 'E10+', 3, 3, '#2b3a55'),
('Terraria', 'Dig, fight, explore, build! The very world is at your fingertips.',
 'A 2D sandbox adventure with procedurally generated worlds, hundreds of items and dozens of bosses.',
 9.99, 0, '2011-05-16', 'T', 4, 4, '#3f8f4f'),
('Portal 2', 'The sequel to the award-winning puzzle game, with a co-op campaign.',
 'Solve physics-based puzzles with the portal gun in the Aperture Science Enrichment Center, alone or with a partner.',
 9.99, 80, '2011-04-18', 'E10+', 5, 5, '#3a6ea5'),
('Baldur''s Gate 3', 'Gather your party and return to the Forgotten Realms in a tale of fellowship and betrayal.',
 'A story-rich, party-based RPG set in the universe of Dungeons & Dragons, with turn-based combat and deep player choice.',
 59.99, 0, '2023-08-03', 'M', 6, 6, '#5a2d82'),
('Elden Ring', 'Rise, Tarnished, and be guided by grace to become an Elden Lord in the Lands Between.',
 'A vast action RPG with open fields, huge dungeons and demanding combat.',
 59.99, 40, '2022-02-25', 'M', 7, 7, '#9c7a2b'),
('Cyberpunk 2077', 'An open-world action-adventure RPG set in the megalopolis of Night City.',
 'Play as V, a mercenary outlaw going after a one-of-a-kind implant that is the key to immortality.',
 59.99, 50, '2020-12-10', 'M', 8, 8, '#c9b81e'),
('The Witcher 3: Wild Hunt', 'Become a monster slayer for hire and search for the child of prophecy.',
 'A story-driven open-world RPG set in a dark fantasy universe.',
 39.99, 75, '2015-05-18', 'M', 8, 8, '#7a1f1f'),
('Factorio', 'Build and maintain factories on an alien planet.',
 'Mine resources, research technologies, build infrastructure, automate production and fight enemies.',
 35.00, 0, '2020-08-14', 'E10+', 9, 9, '#a0522d'),
('RimWorld', 'A sci-fi colony sim driven by an intelligent AI storyteller.',
 'Manage colonists'' moods, needs, wounds and relationships as you build a colony on a distant world.',
 34.99, 0, '2018-10-17', 'M', 10, 10, '#6b6b47'),
('Slay the Spire', 'Craft a unique deck, encounter bizarre creatures and slay the Spire.',
 'A deck-building roguelike where every climb is different.',
 24.99, 60, '2019-01-23', 'T', 11, 11, '#4a6b8a'),
('Outer Wilds', 'An open-world mystery about a solar system trapped in an endless time loop.',
 'Explore a hand-crafted solar system and piece together its secrets.',
 24.99, 0, '2020-06-18', 'E10+', 12, 12, '#d0702a'),
('Vampire Survivors', 'Mow down thousands of night creatures and survive until dawn.',
 'A gothic horror casual game with rogue-lite elements, where your choices let you snowball against hundreds of monsters.',
 4.99, 0, '2022-10-20', 'T', 13, 13, '#6a1b2a'),
('Valheim', 'A brutal exploration and survival game for 1-10 players set in a Viking-inspired afterlife.',
 'Battle, build, and conquer your way to a saga worthy of Odin''s patronage.',
 19.99, 25, '2021-02-02', 'T', 14, 14, '#2f5d62'),
('Celeste', 'Help Madeline survive her inner demons on her journey to the top of Celeste Mountain.',
 'A tight, hand-crafted platformer with hundreds of challenging screens.',
 19.99, 75, '2018-01-25', 'E10+', 15, 15, '#b03a6f');

-- genres per game
INSERT INTO game_genres (game_id, genre_id)
SELECT g.game_id, ge.genre_id FROM (VALUES
 ('Hades','Action'),('Hades','Roguelike'),('Hades','Indie'),
 ('Stardew Valley','Simulation'),('Stardew Valley','RPG'),('Stardew Valley','Indie'),('Stardew Valley','Casual'),
 ('Hollow Knight','Action'),('Hollow Knight','Adventure'),('Hollow Knight','Platformer'),('Hollow Knight','Indie'),
 ('Terraria','Sandbox'),('Terraria','Adventure'),('Terraria','Survival'),('Terraria','Indie'),
 ('Portal 2','Puzzle'),('Portal 2','Adventure'),
 ('Baldur''s Gate 3','RPG'),('Baldur''s Gate 3','Strategy'),('Baldur''s Gate 3','Adventure'),
 ('Elden Ring','Action'),('Elden Ring','RPG'),('Elden Ring','Open World'),
 ('Cyberpunk 2077','RPG'),('Cyberpunk 2077','Open World'),('Cyberpunk 2077','Action'),
 ('The Witcher 3: Wild Hunt','RPG'),('The Witcher 3: Wild Hunt','Open World'),
 ('Factorio','Strategy'),('Factorio','Simulation'),('Factorio','Indie'),
 ('RimWorld','Simulation'),('RimWorld','Strategy'),('RimWorld','Indie'),
 ('Slay the Spire','Strategy'),('Slay the Spire','Roguelike'),('Slay the Spire','Indie'),
 ('Outer Wilds','Adventure'),('Outer Wilds','Puzzle'),('Outer Wilds','Indie'),
 ('Vampire Survivors','Action'),('Vampire Survivors','Roguelike'),('Vampire Survivors','Casual'),
 ('Valheim','Survival'),('Valheim','Open World'),('Valheim','Sandbox'),
 ('Celeste','Platformer'),('Celeste','Indie')
) AS v(title, genre)
JOIN games g  ON g.title = v.title
JOIN genres ge ON ge.name = v.genre;

-- platforms: everything on Windows, some on macOS/Linux
INSERT INTO game_platforms (game_id, platform_id) SELECT game_id, 1 FROM games;
INSERT INTO game_platforms (game_id, platform_id)
SELECT g.game_id, 2 FROM games g WHERE g.title IN ('Hades','Stardew Valley','Hollow Knight','Terraria','Portal 2','Baldur''s Gate 3','Factorio','RimWorld','Slay the Spire','Vampire Survivors','Celeste');
INSERT INTO game_platforms (game_id, platform_id)
SELECT g.game_id, 3 FROM games g WHERE g.title IN ('Stardew Valley','Hollow Knight','Terraria','Portal 2','Factorio','RimWorld','Slay the Spire','Valheim','Celeste');

-- ---------- achievements ----------
INSERT INTO achievements (game_id, name, description)
SELECT g.game_id, v.name, v.descr FROM (VALUES
 ('Hades','Escaped Tartarus','Clear Tartarus for the first time.'),
 ('Hades','Is There No Escape?','Escape the Underworld.'),
 ('Hades','Friends Forever','Max out a relationship with an Olympian.'),
 ('Stardew Valley','Greenhorn','Earn 15,000g.'),
 ('Stardew Valley','A New Friend','Reach a 5-heart friend level with someone.'),
 ('Stardew Valley','Mother Catch','Catch 100 fish.'),
 ('Hollow Knight','Test of Resolve','Defeat Hornet in Greenpath.'),
 ('Hollow Knight','Falsehood','Defeat the False Knight.'),
 ('Terraria','Timber!!','Chop down your first tree.'),
 ('Terraria','Eye on You','Defeat the Eye of Cthulhu.'),
 ('Portal 2','Wake Up Call','Survive the manual override.'),
 ('Portal 2','Lunacy','Complete the single-player campaign.'),
 ('Baldur''s Gate 3','Descent From Avernus','Complete the prologue.'),
 ('Elden Ring','Shardbearer Godrick','Defeat Godrick the Grafted.'),
 ('Factorio','Getting on track','Build a train and use it.'),
 ('Factorio','Automated construction','Build 100 entities using construction robots.'),
 ('Slay the Spire','The Ironclad','Beat the game with the Ironclad.'),
 ('Celeste','Forsaken City','Complete Chapter 1.'),
 ('Vampire Survivors','Survive 30 minutes','Survive for 30 minutes on any stage.')
) AS v(title, name, descr)
JOIN games g ON g.title = v.title;

-- ---------- orders, order_items, library (historical purchases) ----------
-- abhishek: order 1 (Hades, Slay the Spire, Factorio)
INSERT INTO orders (user_id, total_amount, payment_method, created_at) VALUES (2, 57.49, 'card', NOW() - INTERVAL '120 days');
INSERT INTO order_items VALUES (1, 1, 12.50), (1, 12, 9.99), (1, 10, 35.00);
-- abhishek: order 2 (Celeste)
INSERT INTO orders (user_id, total_amount, payment_method, created_at) VALUES (2, 4.99, 'wallet', NOW() - INTERVAL '30 days');
INSERT INTO order_items VALUES (2, 16, 4.99);
-- pixelpaz: order 3 (Stardew, Terraria)
INSERT INTO orders (user_id, total_amount, payment_method, created_at) VALUES (3, 24.98, 'paypal', NOW() - INTERVAL '200 days');
INSERT INTO order_items VALUES (3, 2, 14.99), (3, 4, 9.99);
-- frag_lord: order 4 (Elden Ring, Hollow Knight)
INSERT INTO orders (user_id, total_amount, payment_method, created_at) VALUES (4, 74.98, 'card', NOW() - INTERVAL '90 days');
INSERT INTO order_items VALUES (4, 7, 59.99), (4, 3, 14.99);
-- mika_n: order 5 (Factorio, RimWorld, Hades)
INSERT INTO orders (user_id, total_amount, payment_method, created_at) VALUES (5, 82.49, 'card', NOW() - INTERVAL '60 days');
INSERT INTO order_items VALUES (5, 10, 35.00), (5, 11, 34.99), (5, 1, 12.50);

INSERT INTO library (user_id, game_id, order_id, acquired_at, playtime_minutes, last_played_at, is_favorite) VALUES
(2, 1, 1, NOW() - INTERVAL '120 days', 3420, NOW() - INTERVAL '2 days', TRUE),
(2, 12, 1, NOW() - INTERVAL '120 days', 1890, NOW() - INTERVAL '10 days', FALSE),
(2, 10, 1, NOW() - INTERVAL '120 days', 7260, NOW() - INTERVAL '1 day', TRUE),
(2, 16, 2, NOW() - INTERVAL '30 days', 310, NOW() - INTERVAL '25 days', FALSE),
(3, 2, 3, NOW() - INTERVAL '200 days', 9120, NOW() - INTERVAL '3 hours', TRUE),
(3, 4, 3, NOW() - INTERVAL '200 days', 1200, NOW() - INTERVAL '40 days', FALSE),
(4, 7, 4, NOW() - INTERVAL '90 days', 6015, NOW() - INTERVAL '5 days', TRUE),
(4, 3, 4, NOW() - INTERVAL '90 days', 2400, NOW() - INTERVAL '50 days', FALSE),
(5, 10, 5, NOW() - INTERVAL '60 days', 15400, NOW() - INTERVAL '6 hours', TRUE),
(5, 11, 5, NOW() - INTERVAL '60 days', 4300, NOW() - INTERVAL '8 days', FALSE),
(5, 1, 5, NOW() - INTERVAL '60 days', 900, NOW() - INTERVAL '20 days', FALSE);

-- ---------- reviews (trigger checks ownership) ----------
INSERT INTO reviews (user_id, game_id, recommended, body, helpful_count) VALUES
(2, 1, TRUE,  'Every run feels different and the story keeps pulling you back. Best combat feel I have played in a roguelike.', 14),
(2, 10, TRUE, 'Lost an entire weekend to belt balancing. The factory must grow.', 22),
(2, 12, TRUE, 'Simple rules, endless depth. The deckbuilder that started it all for me.', 6),
(3, 2, TRUE,  'Cozy, relaxing and surprisingly deep. Co-op with friends is the best way to play.', 31),
(3, 4, TRUE,  'Way more content than it looks like. Boss fights are a blast.', 9),
(4, 7, TRUE,  'Brutal but fair. Exploring the open world is incredible.', 18),
(4, 3, FALSE, 'Gorgeous art but the backtracking wore me down. Great for completionists though.', 3),
(5, 10, TRUE, 'Peak automation game. Runs on anything.', 27),
(5, 11, TRUE, 'Every colony becomes its own story.', 11),
(5, 1, TRUE,  'Gorgeous art and music. Easy to pick up for one more run.', 4);

-- ---------- achievements unlocked ----------
INSERT INTO user_achievements (user_id, achievement_id, unlocked_at)
SELECT 2, achievement_id, NOW() - INTERVAL '100 days' FROM achievements WHERE name IN ('Escaped Tartarus','Is There No Escape?','Getting on track','The Ironclad');
INSERT INTO user_achievements (user_id, achievement_id, unlocked_at)
SELECT 3, achievement_id, NOW() - INTERVAL '150 days' FROM achievements WHERE name IN ('Greenhorn','A New Friend','Timber!!');
INSERT INTO user_achievements (user_id, achievement_id, unlocked_at)
SELECT 4, achievement_id, NOW() - INTERVAL '80 days' FROM achievements WHERE name IN ('Shardbearer Godrick','Falsehood');
INSERT INTO user_achievements (user_id, achievement_id, unlocked_at)
SELECT 5, achievement_id, NOW() - INTERVAL '50 days' FROM achievements WHERE name IN ('Getting on track','Automated construction','Escaped Tartarus');

-- ---------- wishlist, cart, friends ----------
INSERT INTO wishlist (user_id, game_id) VALUES (2, 6), (2, 13), (2, 15), (3, 16), (3, 14), (4, 8), (4, 9), (5, 5);
INSERT INTO cart_items (user_id, game_id) VALUES (2, 14), (3, 5);
INSERT INTO friendships (requester_id, addressee_id, status) VALUES
(2, 3, 'accepted'), (2, 5, 'accepted'), (4, 2, 'pending'), (3, 5, 'accepted');

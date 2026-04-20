-- =============================================
-- JourneyOS — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor
-- =============================================

CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    TEXT UNIQUE NOT NULL,
  avatar_url  TEXT,
  currency    TEXT DEFAULT 'INR',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE trips (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  origin        TEXT NOT NULL,
  destination   TEXT NOT NULL,
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  total_budget  NUMERIC(12, 2) DEFAULT 0,
  cover_image   TEXT,
  status        TEXT CHECK (status IN ('planning','active','completed')) DEFAULT 'planning',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE itinerary_days (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id    UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  day_number INT NOT NULL,
  date       DATE NOT NULL,
  notes      TEXT,
  UNIQUE(trip_id, day_number)
);

CREATE TABLE itinerary_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id       UUID NOT NULL REFERENCES itinerary_days(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  type         TEXT CHECK (type IN ('activity','meal','transport','accommodation','other')),
  start_time   TIME,
  end_time     TIME,
  location     TEXT,
  lat          FLOAT,
  lng          FLOAT,
  cost         NUMERIC(10, 2) DEFAULT 0,
  sort_order   INT DEFAULT 0,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE transport_options (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id        UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  mode           TEXT CHECK (mode IN ('flight','train','bus','cab','ferry')),
  provider       TEXT,
  departure_time TIMESTAMPTZ,
  arrival_time   TIMESTAMPTZ,
  duration_mins  INT,
  price          NUMERIC(10, 2),
  comfort_score  SMALLINT CHECK (comfort_score BETWEEN 1 AND 5),
  is_selected    BOOLEAN DEFAULT FALSE,
  raw_data       JSONB,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE hotels (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id         UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  address         TEXT,
  lat             FLOAT,
  lng             FLOAT,
  price_per_night NUMERIC(10, 2),
  rating          NUMERIC(3, 1),
  distance_m      INT,
  amenities       TEXT[],
  is_bookmarked   BOOLEAN DEFAULT FALSE,
  booking_url     TEXT,
  image_url       TEXT
);

CREATE TABLE expenses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id     UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  category    TEXT CHECK (category IN ('food','transport','stay','activity','shopping','other')),
  title       TEXT NOT NULL,
  amount      NUMERIC(10, 2) NOT NULL,
  currency    TEXT DEFAULT 'INR',
  paid_at     DATE NOT NULL DEFAULT CURRENT_DATE,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE checklist_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id     UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  is_checked  BOOLEAN DEFAULT FALSE,
  category    TEXT CHECK (category IN ('clothing','documents','toiletries','electronics','medicine','other')),
  is_auto     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE documents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id      UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES profiles(id),
  filename     TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_type    TEXT,
  file_size    INT,
  label        TEXT,
  url          TEXT,
  uploaded_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Row Level Security ──────────────────────────────────────────

ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips            ENABLE ROW LEVEL SECURITY;
ALTER TABLE itinerary_days   ENABLE ROW LEVEL SECURITY;
ALTER TABLE itinerary_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotels           ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents        ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users manage own profile" ON profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Trips
CREATE POLICY "Users manage own trips" ON trips FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Itinerary days (via trips)
CREATE POLICY "Users manage own itinerary days" ON itinerary_days FOR ALL
  USING (trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()));

-- Itinerary items (via days → trips)
CREATE POLICY "Users manage own itinerary items" ON itinerary_items FOR ALL
  USING (day_id IN (SELECT id FROM itinerary_days WHERE trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid())));

-- Transport options
CREATE POLICY "Users manage own transport" ON transport_options FOR ALL
  USING (trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()));

-- Hotels
CREATE POLICY "Users manage own hotels" ON hotels FOR ALL
  USING (trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()));

-- Expenses
CREATE POLICY "Users manage own expenses" ON expenses FOR ALL
  USING (trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()));

-- Checklist
CREATE POLICY "Users manage own checklist" ON checklist_items FOR ALL
  USING (trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()));

-- Documents
CREATE POLICY "Users manage own documents" ON documents FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── Indexes ─────────────────────────────────────────────────────

CREATE INDEX ON trips(user_id);
CREATE INDEX ON itinerary_days(trip_id);
CREATE INDEX ON itinerary_items(day_id, sort_order);
CREATE INDEX ON expenses(trip_id, paid_at);
CREATE INDEX ON documents(trip_id, user_id);

-- ── Storage bucket for documents ───────────────────────────────
-- Run in Supabase Dashboard → Storage → New Bucket → name: "documents" → Public: false
-- Then add this storage policy:
-- INSERT INTO storage.policies (name, bucket_id, operation, definition)
-- VALUES ('Users can upload their docs', 'documents', 'INSERT', 'auth.uid()::text = (storage.foldername(name))[1]');

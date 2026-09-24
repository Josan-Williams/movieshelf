-- MovieShelf combined schema v1 (PostgreSQL). Reference for your Drizzle schema. Review before use.
-- "user" is created by Better Auth; the stand-in line below is for testing only.
CREATE TABLE "user"(id text PRIMARY KEY, email text NOT NULL UNIQUE); -- stand-in for Better Auth's table
CREATE TABLE movies (
  movie_id      integer GENERATED ALWAYS AS IDENTITY,
  tmdb_id       integer      NOT NULL,
  title         varchar(300) NOT NULL,
  release_date  date,
  poster_path   varchar(200),
  created_at    timestamptz  NOT NULL DEFAULT now(),
  updated_at    timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT pk_movies PRIMARY KEY (movie_id),
  CONSTRAINT uq_movies_tmdb_id UNIQUE (tmdb_id),
  CONSTRAINT ck_movies_tmdb_id CHECK (tmdb_id > 0)
);
CREATE TABLE directors (
  director_id     integer GENERATED ALWAYS AS IDENTITY,
  tmdb_person_id  integer      NOT NULL,
  name            varchar(200) NOT NULL,
  CONSTRAINT pk_directors PRIMARY KEY (director_id),
  CONSTRAINT uq_directors_tmdb_person_id UNIQUE (tmdb_person_id)
);
CREATE TABLE genres (
  genre_id       integer GENERATED ALWAYS AS IDENTITY,
  tmdb_genre_id  integer     NOT NULL,
  name           varchar(50) NOT NULL,
  CONSTRAINT pk_genres PRIMARY KEY (genre_id),
  CONSTRAINT uq_genres_tmdb_genre_id UNIQUE (tmdb_genre_id),
  CONSTRAINT uq_genres_name UNIQUE (name)
);
CREATE TABLE movie_directors (
  movie_id     integer NOT NULL,
  director_id  integer NOT NULL,
  CONSTRAINT pk_movie_directors PRIMARY KEY (movie_id, director_id),
  CONSTRAINT fk_movie_directors_movie FOREIGN KEY (movie_id) REFERENCES movies(movie_id) ON DELETE CASCADE,
  CONSTRAINT fk_movie_directors_director FOREIGN KEY (director_id) REFERENCES directors(director_id) ON DELETE RESTRICT
);
CREATE INDEX ix_movie_directors_director ON movie_directors (director_id);
CREATE TABLE movie_genres (
  movie_id  integer NOT NULL,
  genre_id  integer NOT NULL,
  CONSTRAINT pk_movie_genres PRIMARY KEY (movie_id, genre_id),
  CONSTRAINT fk_movie_genres_movie FOREIGN KEY (movie_id) REFERENCES movies(movie_id) ON DELETE CASCADE,
  CONSTRAINT fk_movie_genres_genre FOREIGN KEY (genre_id) REFERENCES genres(genre_id) ON DELETE RESTRICT
);
CREATE INDEX ix_movie_genres_genre ON movie_genres (genre_id);
CREATE TABLE collection_items (
  user_id   text        NOT NULL,
  movie_id  integer     NOT NULL,
  added_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pk_collection_items PRIMARY KEY (user_id, movie_id),
  CONSTRAINT fk_collection_items_user FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE,
  CONSTRAINT fk_collection_items_movie FOREIGN KEY (movie_id) REFERENCES movies(movie_id) ON DELETE RESTRICT
);
CREATE TABLE ratings (
  rating_id     integer GENERATED ALWAYS AS IDENTITY,
  user_id       text        NOT NULL,
  movie_id      integer     NOT NULL,
  rating_value  smallint    NOT NULL,
  review        text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pk_ratings PRIMARY KEY (rating_id),
  CONSTRAINT uq_ratings_user_movie UNIQUE (user_id, movie_id),
  CONSTRAINT ck_ratings_value CHECK (rating_value BETWEEN 1 AND 10),
  CONSTRAINT ck_ratings_review_length CHECK (review IS NULL OR char_length(review) <= 2000),
  CONSTRAINT fk_ratings_user FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE,
  CONSTRAINT fk_ratings_movie FOREIGN KEY (movie_id) REFERENCES movies(movie_id) ON DELETE RESTRICT
);
CREATE TABLE audit_logs (
  audit_id       bigint GENERATED ALWAYS AS IDENTITY,
  user_id        text,
  action         varchar(50)  NOT NULL,
  resource_type  varchar(50)  NOT NULL,
  resource_id    varchar(100),
  details        jsonb,
  timestamp_utc  timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT pk_audit_logs PRIMARY KEY (audit_id),
  CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE RESTRICT,
  CONSTRAINT ck_audit_logs_action CHECK (action IN (
    'auth.sign_up','auth.sign_in','auth.sign_in_failed','auth.sign_out',
    'collection.add','collection.remove','rating.create','rating.update','ai.search'))
);
CREATE INDEX ix_audit_logs_user_time ON audit_logs (user_id, timestamp_utc DESC);
CREATE FUNCTION prevent_audit_change() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'audit_logs is append-only'; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_audit_logs_append_only BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_change();

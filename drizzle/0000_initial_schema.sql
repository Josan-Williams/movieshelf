CREATE TABLE "audit_logs" (
	"audit_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audit_logs_audit_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" text,
	"action" varchar(50) NOT NULL,
	"resource_type" varchar(50) NOT NULL,
	"resource_id" varchar(100),
	"details" jsonb,
	"timestamp_utc" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_audit_logs_action" CHECK (action IN ('auth.sign_up', 'auth.sign_in', 'auth.sign_in_failed', 'auth.sign_out', 'collection.add', 'collection.remove', 'rating.create', 'rating.update', 'ai.search'))
);
--> statement-breakpoint
CREATE TABLE "collection_items" (
	"user_id" text NOT NULL,
	"movie_id" integer NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pk_collection_items" PRIMARY KEY("user_id","movie_id")
);
--> statement-breakpoint
CREATE TABLE "directors" (
	"director_id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "directors_director_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tmdb_person_id" integer NOT NULL,
	"name" varchar(200) NOT NULL,
	CONSTRAINT "uq_directors_tmdb_person_id" UNIQUE("tmdb_person_id")
);
--> statement-breakpoint
CREATE TABLE "genres" (
	"genre_id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "genres_genre_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tmdb_genre_id" integer NOT NULL,
	"name" varchar(50) NOT NULL,
	CONSTRAINT "uq_genres_tmdb_genre_id" UNIQUE("tmdb_genre_id"),
	CONSTRAINT "uq_genres_name" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "movie_directors" (
	"movie_id" integer NOT NULL,
	"director_id" integer NOT NULL,
	CONSTRAINT "pk_movie_directors" PRIMARY KEY("movie_id","director_id")
);
--> statement-breakpoint
CREATE TABLE "movie_genres" (
	"movie_id" integer NOT NULL,
	"genre_id" integer NOT NULL,
	CONSTRAINT "pk_movie_genres" PRIMARY KEY("movie_id","genre_id")
);
--> statement-breakpoint
CREATE TABLE "movies" (
	"movie_id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "movies_movie_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tmdb_id" integer NOT NULL,
	"title" varchar(300) NOT NULL,
	"release_date" date,
	"poster_path" varchar(200),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_movies_tmdb_id" UNIQUE("tmdb_id"),
	CONSTRAINT "ck_movies_tmdb_id" CHECK ("movies"."tmdb_id" > 0)
);
--> statement-breakpoint
CREATE TABLE "ratings" (
	"rating_id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ratings_rating_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" text NOT NULL,
	"movie_id" integer NOT NULL,
	"rating_value" smallint NOT NULL,
	"review" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_ratings_user_movie" UNIQUE("user_id","movie_id"),
	CONSTRAINT "ck_ratings_value" CHECK ("ratings"."rating_value" BETWEEN 1 AND 10),
	CONSTRAINT "ck_ratings_review_length" CHECK ("ratings"."review" IS NULL OR char_length("ratings"."review") <= 2000)
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_movie_id_movies_movie_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("movie_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movie_directors" ADD CONSTRAINT "movie_directors_movie_id_movies_movie_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("movie_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movie_directors" ADD CONSTRAINT "movie_directors_director_id_directors_director_id_fk" FOREIGN KEY ("director_id") REFERENCES "public"."directors"("director_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movie_genres" ADD CONSTRAINT "movie_genres_movie_id_movies_movie_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("movie_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movie_genres" ADD CONSTRAINT "movie_genres_genre_id_genres_genre_id_fk" FOREIGN KEY ("genre_id") REFERENCES "public"."genres"("genre_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_movie_id_movies_movie_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("movie_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_audit_logs_user_time" ON "audit_logs" USING btree ("user_id","timestamp_utc" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "ix_movie_directors_director" ON "movie_directors" USING btree ("director_id");--> statement-breakpoint
CREATE INDEX "ix_movie_genres_genre" ON "movie_genres" USING btree ("genre_id");
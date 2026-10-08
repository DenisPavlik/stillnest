-- Extensions must exist before the columns and constraints that need them.
--   vector      -> properties.embedding, for search-by-feeling
--   btree_gist  -> lets an EXCLUDE constraint mix uuid equality with range overlap
CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
CREATE TYPE "public"."biome" AS ENUM('forest', 'snow', 'desert', 'bamboo', 'coast', 'highland');--> statement-breakpoint
CREATE TYPE "public"."block_reason" AS ENUM('maintenance', 'owner', 'hold');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('pending', 'confirmed', 'cancelled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."connectivity" AS ENUM('none', 'weak', 'full');--> statement-breakpoint
CREATE TYPE "public"."property_status" AS ENUM('draft', 'live');--> statement-breakpoint
CREATE TYPE "public"."scene_kind" AS ENUM('exterior', 'interior', 'view', 'weather');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('guest', 'admin');--> statement-breakpoint
CREATE TABLE "accounts" (
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "amenities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(60) NOT NULL,
	"label" text NOT NULL,
	"icon" text,
	CONSTRAINT "amenities_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "availability_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"reason" "block_reason" NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"check_in" date NOT NULL,
	"check_out" date NOT NULL,
	"guests" smallint NOT NULL,
	"nights" integer GENERATED ALWAYS AS (("bookings"."check_out" - "bookings"."check_in")) STORED,
	"subtotal_cents" integer NOT NULL,
	"fees_cents" integer DEFAULT 0 NOT NULL,
	"total_cents" integer GENERATED ALWAYS AS (("bookings"."subtotal_cents" + "bookings"."fees_cents")) STORED,
	"status" "booking_status" DEFAULT 'pending' NOT NULL,
	"stripe_session_id" text,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pricing_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"price_cents" integer NOT NULL,
	"min_nights" smallint,
	"label" text
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"full_name" text,
	"role" "user_role" DEFAULT 'guest' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(80) NOT NULL,
	"name" text NOT NULL,
	"tagline" text,
	"description" text NOT NULL,
	"biome" "biome" NOT NULL,
	"country" text NOT NULL,
	"region" text NOT NULL,
	"lat" real NOT NULL,
	"lng" real NOT NULL,
	"capacity" smallint NOT NULL,
	"bedrooms" smallint NOT NULL,
	"base_price_cents" integer NOT NULL,
	"min_nights" smallint DEFAULT 2 NOT NULL,
	"solitude_km" real NOT NULL,
	"noise_db" smallint NOT NULL,
	"connectivity" "connectivity" NOT NULL,
	"bortle" smallint NOT NULL,
	"status" "property_status" DEFAULT 'draft' NOT NULL,
	"embedding" vector(1536),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "properties_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "property_amenities" (
	"property_id" uuid NOT NULL,
	"amenity_id" uuid NOT NULL,
	CONSTRAINT "property_amenities_property_id_amenity_id_pk" PRIMARY KEY("property_id","amenity_id")
);
--> statement-breakpoint
CREATE TABLE "property_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"path" text NOT NULL,
	"alt" text NOT NULL,
	"sort" smallint DEFAULT 0 NOT NULL,
	"is_hero" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property_scenes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"kind" "scene_kind" NOT NULL,
	"poster_path" text NOT NULL,
	"video_path" text,
	"audio_path" text,
	"caption" text,
	"sort" smallint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_stays" (
	"user_id" text NOT NULL,
	"property_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saved_stays_user_id_property_id_pk" PRIMARY KEY("user_id","property_id"),
	CONSTRAINT "saved_stays_unique" UNIQUE("user_id","property_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"email_verified" timestamp with time zone,
	"image" text,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_blocks" ADD CONSTRAINT "availability_blocks_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_amenities" ADD CONSTRAINT "property_amenities_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_amenities" ADD CONSTRAINT "property_amenities_amenity_id_amenities_id_fk" FOREIGN KEY ("amenity_id") REFERENCES "public"."amenities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_images" ADD CONSTRAINT "property_images_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_scenes" ADD CONSTRAINT "property_scenes_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_stays" ADD CONSTRAINT "saved_stays_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_stays" ADD CONSTRAINT "saved_stays_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "availability_blocks_property_idx" ON "availability_blocks" USING btree ("property_id","starts_on");--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_stripe_session_idx" ON "bookings" USING btree ("stripe_session_id");--> statement-breakpoint
CREATE INDEX "bookings_property_idx" ON "bookings" USING btree ("property_id","check_in");--> statement-breakpoint
CREATE INDEX "bookings_user_idx" ON "bookings" USING btree ("user_id","check_in");--> statement-breakpoint
CREATE INDEX "pricing_rules_property_idx" ON "pricing_rules" USING btree ("property_id","starts_on");--> statement-breakpoint
CREATE INDEX "properties_biome_idx" ON "properties" USING btree ("biome");--> statement-breakpoint
CREATE INDEX "properties_status_idx" ON "properties" USING btree ("status");--> statement-breakpoint
CREATE INDEX "properties_solitude_idx" ON "properties" USING btree ("solitude_km");--> statement-breakpoint
CREATE INDEX "property_images_property_idx" ON "property_images" USING btree ("property_id","sort");--> statement-breakpoint
CREATE INDEX "property_scenes_property_idx" ON "property_scenes" USING btree ("property_id","sort");
--> statement-breakpoint
-- ====================================================================
--  THE CONSTRAINT THIS WHOLE PROJECT LEANS ON
--
--  Double-booking is prevented by the database, not by application code.
--  No sequence of concurrent requests can defeat it, because Postgres
--  refuses the second write rather than the app remembering to check.
--
--  The range is HALF-OPEN, '[)':  check_in is occupied, check_out is not.
--  So a guest leaving on the 5th and another arriving on the 5th do NOT
--  collide. This is correct hotel semantics and the classic off-by-one.
--
--  Only live holds participate. A cancelled or expired booking drops out
--  of the WHERE clause and frees its dates automatically.
-- ====================================================================
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_no_overlap"
  EXCLUDE USING gist (
    "property_id" WITH =,
    daterange("check_in", "check_out", '[)') WITH &&
  ) WHERE ("status" IN ('pending', 'confirmed'));--> statement-breakpoint

-- Sanity constraints. Cheap here, expensive as a bug.
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_dates_ordered"
  CHECK ("check_out" > "check_in");--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_guests_positive"
  CHECK ("guests" >= 1);--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_money_non_negative"
  CHECK ("subtotal_cents" >= 0 AND "fees_cents" >= 0);--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_dates_ordered"
  CHECK ("ends_on" > "starts_on");--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_price_non_negative"
  CHECK ("price_cents" >= 0);--> statement-breakpoint
ALTER TABLE "availability_blocks" ADD CONSTRAINT "availability_blocks_dates_ordered"
  CHECK ("ends_on" > "starts_on");--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_bortle_range"
  CHECK ("bortle" BETWEEN 1 AND 9);--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_price_positive"
  CHECK ("base_price_cents" > 0);--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_capacity_positive"
  CHECK ("capacity" >= 1 AND "bedrooms" >= 0);--> statement-breakpoint

-- Cosine similarity over the description embedding. HNSW rather than IVFFlat:
-- it needs no training pass, so it behaves on a table that starts empty.
CREATE INDEX "properties_embedding_idx" ON "properties"
  USING hnsw ("embedding" vector_cosine_ops);

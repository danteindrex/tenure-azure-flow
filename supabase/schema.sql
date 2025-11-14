


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."better_auth_invitation_status" AS ENUM (
    'pending',
    'accepted',
    'declined',
    'expired'
);


ALTER TYPE "public"."better_auth_invitation_status" OWNER TO "postgres";


CREATE TYPE "public"."dispute_type" AS ENUM (
    'charge_dispute',
    'fraudulent',
    'duplicate',
    'product_not_received',
    'product_unacceptable',
    'subscription_canceled',
    'unrecognized',
    'other'
);


ALTER TYPE "public"."dispute_type" OWNER TO "postgres";


CREATE TYPE "public"."enum_user_memberships_verification_status" AS ENUM (
    'PENDING',
    'VERIFIED',
    'FAILED',
    'SKIPPED'
);


ALTER TYPE "public"."enum_user_memberships_verification_status" OWNER TO "postgres";


CREATE TYPE "public"."enum_user_payments_status" AS ENUM (
    'succeeded',
    'pending',
    'failed',
    'refunded',
    'canceled'
);


ALTER TYPE "public"."enum_user_payments_status" OWNER TO "postgres";


CREATE TYPE "public"."enum_user_subscriptions_status" AS ENUM (
    'active',
    'past_due',
    'canceled',
    'incomplete',
    'trialing',
    'unpaid'
);


ALTER TYPE "public"."enum_user_subscriptions_status" OWNER TO "postgres";


CREATE TYPE "public"."enum_users_status" AS ENUM (
    'Active',
    'Inactive',
    'Suspended',
    'Pending'
);


ALTER TYPE "public"."enum_users_status" OWNER TO "postgres";


CREATE TYPE "public"."kyc_verification_status" AS ENUM (
    'pending',
    'in_review',
    'verified',
    'rejected',
    'expired'
);


ALTER TYPE "public"."kyc_verification_status" OWNER TO "postgres";


CREATE TYPE "public"."member_status" AS ENUM (
    'UNVERIFIED',
    'PROSPECT',
    'ACTIVE',
    'PENDING'
);


ALTER TYPE "public"."member_status" OWNER TO "postgres";


CREATE TYPE "public"."payout_status" AS ENUM (
    'pending_approval',
    'approved',
    'scheduled',
    'processing',
    'completed',
    'failed',
    'cancelled'
);


ALTER TYPE "public"."payout_status" OWNER TO "postgres";


CREATE TYPE "public"."signup_session_status" AS ENUM (
    'active',
    'completed',
    'expired'
);


ALTER TYPE "public"."signup_session_status" OWNER TO "postgres";


CREATE TYPE "public"."transaction_risk_level" AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
);


ALTER TYPE "public"."transaction_risk_level" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assign_queue_position"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Only assign position if it's NULL (new member)
    IF NEW.queue_position IS NULL THEN
        -- Get the next position based on current max position
        SELECT COALESCE(MAX(queue_position), 0) + 1 
        INTO NEW.queue_position 
        FROM membership_queue;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."assign_queue_position"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_issue_payouts"("p_company_id" bigint) RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_eligible BOOLEAN;
BEGIN
    SELECT is_eligible_for_payout INTO v_eligible
    FROM Company
    WHERE CompanyID = p_company_id;

    RETURN COALESCE(v_eligible, FALSE);
END;
$$;


ALTER FUNCTION "public"."can_issue_payouts"("p_company_id" bigint) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."can_issue_payouts"("p_company_id" bigint) IS 'Check if company meets criteria for issuing payouts (12 months + $100k revenue)';



CREATE OR REPLACE FUNCTION "public"."cleanup_expired_signup_sessions"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  DELETE FROM signup_sessions 
  WHERE expires_at < NOW();
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_signup_sessions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_verification_codes"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  DELETE FROM verification_codes 
  WHERE expires_at < NOW();
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_verification_codes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."exec_sql"("sql_query" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    result text;
BEGIN
    EXECUTE sql_query;
    RETURN 'SQL executed successfully';
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'Error: ' || SQLERRM;
END;
$$;


ALTER FUNCTION "public"."exec_sql"("sql_query" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_next_payout_winners"("p_company_id" bigint, "p_max_winners" integer DEFAULT 1) RETURNS TABLE("member_id" bigint, "member_name" character varying, "queue_position" integer, "months_subscribed" integer, "lifetime_total" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        q.MemberID,
        m.name,
        q.queue_position,
        q.total_months_subscribed,
        q.lifetime_payment_total
    FROM Queue q
    JOIN member m ON q.MemberID = m.id
    WHERE q.is_eligible = TRUE
      AND q.subscription_active = TRUE
      AND NOT EXISTS (
          SELECT 1 FROM Payout p
          WHERE p.MemberID = q.MemberID
            AND p.CompanyID = p_company_id
            AND p.status != 'canceled'
      )
    ORDER BY q.queue_position
    LIMIT p_max_winners;
END;
$$;


ALTER FUNCTION "public"."get_next_payout_winners"("p_company_id" bigint, "p_max_winners" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_next_payout_winners"("p_company_id" bigint, "p_max_winners" integer) IS 'Returns eligible members for next payout based on queue position';



CREATE OR REPLACE FUNCTION "public"."get_queue_statistics"() RETURNS TABLE("total_members" bigint, "eligible_members" bigint, "members_meeting_time_req" bigint, "total_revenue" numeric, "oldest_member_date" timestamp with time zone, "newest_member_date" timestamp with time zone, "potential_winners" integer)
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE is_eligible = true)::BIGINT,
    COUNT(*) FILTER (WHERE meets_time_requirement = true)::BIGINT,
    COALESCE(SUM(lifetime_payment_total), 0)::NUMERIC,
    MIN(tenure_start_date),
    MAX(tenure_start_date),
    LEAST(
      FLOOR(COALESCE(SUM(lifetime_payment_total), 0) / 100000)::INTEGER,
      COUNT(*) FILTER (WHERE is_eligible = true)::INTEGER
    )
  FROM active_member_queue_view;
END;
$$;


ALTER FUNCTION "public"."get_queue_statistics"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_queue_statistics"() IS 'Returns aggregated statistics from the active member queue materialized view.';



CREATE OR REPLACE FUNCTION "public"."get_user_queue_position"("p_user_id" "uuid") RETURNS TABLE("membership_id" "uuid", "user_id" "uuid", "queue_position" bigint, "tenure_start_date" timestamp with time zone, "total_payments" bigint, "lifetime_total" numeric, "is_eligible" boolean)
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.membership_id,
    v.user_id,
    v.queue_position,
    v.tenure_start_date,
    v.total_successful_payments,
    v.lifetime_payment_total,
    v.is_eligible
  FROM active_member_queue_view v
  WHERE v.user_id = p_user_id
  ORDER BY v.queue_position;
END;
$$;


ALTER FUNCTION "public"."get_user_queue_position"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    user_name TEXT;
    user_phone TEXT;
    user_street TEXT;
    user_city TEXT;
    user_state TEXT;
    user_zip TEXT;
    first_name TEXT;
    last_name TEXT;
    new_user_id UUID;
BEGIN
    -- Extract user data from metadata
    user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
    user_phone := NEW.raw_user_meta_data->>'phone';
    user_street := NEW.raw_user_meta_data->'address'->>'street';
    user_city := NEW.raw_user_meta_data->'address'->>'city';
    user_state := NEW.raw_user_meta_data->'address'->>'state';
    user_zip := NEW.raw_user_meta_data->'address'->>'zip';
    
    -- Split name into first and last
    IF user_name IS NOT NULL AND position(' ' in user_name) > 0 THEN
        first_name := split_part(user_name, ' ', 1);
        last_name := substring(user_name from position(' ' in user_name) + 1);
    ELSE
        first_name := user_name;
        last_name := NULL;
    END IF;
    
    -- 1. Insert into users table
    INSERT INTO public.users (auth_user_id, email, email_verified, status, created_at, updated_at)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.email_confirmed_at IS NOT NULL, false), 'Pending', NOW(), NOW())
    RETURNING id INTO new_user_id;
    
    -- 2. Insert profile if we have name data
    IF first_name IS NOT NULL THEN
        INSERT INTO public.user_profiles (user_id, first_name, last_name, created_at, updated_at)
        VALUES (new_user_id, first_name, last_name, NOW(), NOW());
    END IF;
    
    -- 3. Insert phone contact if provided
    IF user_phone IS NOT NULL AND user_phone != '' THEN
        INSERT INTO public.user_contacts (user_id, contact_type, contact_value, is_primary, is_verified, created_at, updated_at)
        VALUES (new_user_id, 'phone', user_phone, true, false, NOW(), NOW());
    END IF;
    
    -- 4. Insert address if provided
    IF user_street IS NOT NULL OR user_city IS NOT NULL OR user_state IS NOT NULL OR user_zip IS NOT NULL THEN
        INSERT INTO public.user_addresses (user_id, address_type, street_address, city, state, postal_code, country_code, is_primary, created_at, updated_at)
        VALUES (new_user_id, 'primary', user_street, user_city, user_state, user_zip, 'US', true, NOW(), NOW());
    END IF;
    
    -- 5. Insert membership record
    INSERT INTO public.user_memberships (user_id, join_date, tenure, verification_status, created_at, updated_at)
    VALUES (new_user_id, CURRENT_DATE, 0, 'PENDING', NOW(), NOW());
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the auth user creation
        RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
        RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_profiles_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_profiles_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_queue_refresh"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Notify that a refresh might be needed
  PERFORM pg_notify('queue_refresh_needed', json_build_object(
    'timestamp', NOW(),
    'trigger_table', TG_TABLE_NAME,
    'operation', TG_OP
  )::text);

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_queue_refresh"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."notify_queue_refresh"() IS 'Sends notification when queue data changes.
Listen with: LISTEN queue_refresh_needed;
Allows application to trigger manual refresh on critical operations.';



CREATE OR REPLACE FUNCTION "public"."refresh_active_member_queue"() RETURNS TABLE("status" "text", "rows_refreshed" bigint, "refresh_duration" interval, "last_calculated" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  start_time TIMESTAMP WITH TIME ZONE;
  end_time TIMESTAMP WITH TIME ZONE;
  row_count BIGINT;
  last_calc TIMESTAMP WITH TIME ZONE;
BEGIN
  start_time := clock_timestamp();
  REFRESH MATERIALIZED VIEW CONCURRENTLY active_member_queue_view;
  end_time := clock_timestamp();
  
  SELECT COUNT(*), MAX(calculated_at)
  INTO row_count, last_calc
  FROM active_member_queue_view;
  
  RETURN QUERY
  SELECT 'SUCCESS'::TEXT, row_count, end_time - start_time, last_calc;
  
  RAISE NOTICE 'Queue refreshed: % rows in %', row_count, end_time - start_time;
END;
$$;


ALTER FUNCTION "public"."refresh_active_member_queue"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."refresh_active_member_queue"() IS 'Refreshes the active member queue materialized view using CONCURRENT mode.
Returns status, row count, duration, and last calculated timestamp.
Safe to call during production - does not block reads.';



CREATE OR REPLACE FUNCTION "public"."refresh_active_member_queue_fast"() RETURNS TABLE("status" "text", "rows_refreshed" bigint, "refresh_duration" interval)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  start_time TIMESTAMP WITH TIME ZONE;
  end_time TIMESTAMP WITH TIME ZONE;
  row_count BIGINT;
BEGIN
  start_time := clock_timestamp();

  -- Standard refresh - faster but locks the view
  REFRESH MATERIALIZED VIEW active_member_queue_view;

  end_time := clock_timestamp();

  SELECT COUNT(*) INTO row_count FROM active_member_queue_view;

  RETURN QUERY
  SELECT
    'SUCCESS'::TEXT,
    row_count,
    end_time - start_time;

  RAISE NOTICE 'Queue refreshed (fast): % rows in %', row_count, end_time - start_time;
END;
$$;


ALTER FUNCTION "public"."refresh_active_member_queue_fast"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."refresh_active_member_queue_fast"() IS 'Fast refresh without CONCURRENT mode - locks the view during refresh.
Use during maintenance windows or low-traffic periods.
~3x faster than concurrent refresh but blocks reads.';



CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."account" (
    "id" "text" NOT NULL,
    "account_id" "text" NOT NULL,
    "provider_id" "text" NOT NULL,
    "access_token" "text",
    "refresh_token" "text",
    "access_token_expires_at" timestamp without time zone,
    "scope" "text",
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone NOT NULL,
    "id_token" "text",
    "refresh_token_expires_at" timestamp without time zone,
    "password" "text",
    "user_id" "uuid" NOT NULL
);


ALTER TABLE "public"."account" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payout_management" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "payout_id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "queue_position" integer NOT NULL,
    "amount" numeric(12,2) DEFAULT 100000.00 NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text",
    "status" "text" DEFAULT 'pending_approval'::"text" NOT NULL,
    "eligibility_check" "jsonb" DEFAULT '{}'::"jsonb",
    "approval_workflow" "jsonb" DEFAULT '[]'::"jsonb",
    "scheduled_date" timestamp with time zone,
    "payment_method" "text" DEFAULT 'ach'::"text" NOT NULL,
    "bank_details" "jsonb",
    "tax_withholding" "jsonb",
    "processing" "jsonb",
    "receipt_url" "text",
    "internal_notes" "jsonb" DEFAULT '[]'::"jsonb",
    "audit_trail" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "membership_id" "uuid"
);


ALTER TABLE "public"."payout_management" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_memberships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "join_date" "date" DEFAULT "now"() NOT NULL,
    "tenure" numeric DEFAULT 0,
    "verification_status" "public"."enum_user_memberships_verification_status" DEFAULT 'PENDING'::"public"."enum_user_memberships_verification_status",
    "assigned_admin_id_id" integer,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "subscription_id" "uuid"
);


ALTER TABLE "public"."user_memberships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "subscription_id" "uuid",
    "payment_method_id" "uuid",
    "provider" character varying(20) DEFAULT 'stripe'::character varying NOT NULL,
    "provider_payment_id" character varying(255),
    "provider_invoice_id" character varying(255),
    "provider_charge_id" character varying(255),
    "amount" numeric(10,2) NOT NULL,
    "currency" character(3) DEFAULT 'USD'::"bpchar",
    "payment_type" character varying(20) NOT NULL,
    "payment_date" timestamp with time zone NOT NULL,
    "status" "public"."enum_user_payments_status" NOT NULL,
    "is_first_payment" boolean DEFAULT false,
    "failure_reason" "text",
    "receipt_url" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" character varying NOT NULL,
    "user_id" "uuid",
    "first_name" character varying,
    "last_name" character varying,
    "middle_name" character varying,
    "date_of_birth" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "provider" character varying(20) DEFAULT 'stripe'::character varying NOT NULL,
    "provider_subscription_id" character varying(255) NOT NULL,
    "provider_customer_id" character varying(255) NOT NULL,
    "status" "public"."enum_user_subscriptions_status" NOT NULL,
    "current_period_start" timestamp with time zone NOT NULL,
    "current_period_end" timestamp with time zone NOT NULL,
    "cancel_at_period_end" boolean DEFAULT false,
    "canceled_at" timestamp with time zone,
    "trial_end" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auth_user_id" "text",
    "email" character varying(255) NOT NULL,
    "email_verified" boolean DEFAULT false,
    "status" "public"."enum_users_status" DEFAULT 'Pending'::"public"."enum_users_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "name" "text",
    "image" "text",
    "two_factor_enabled" boolean DEFAULT false
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "public"."active_member_queue_view" AS
 SELECT "um"."id" AS "membership_id",
    "u"."id" AS "user_id",
    "u"."email",
    "u"."created_at" AS "user_created_at",
    "up"."first_name",
    "up"."last_name",
    "up"."middle_name",
    "concat_ws"(' '::"text", "up"."first_name", "up"."middle_name", "up"."last_name") AS "full_name",
    "s"."id" AS "subscription_id",
    "s"."status" AS "subscription_status",
    "s"."provider_subscription_id",
    "um"."join_date",
    "um"."verification_status",
    "min"("p"."created_at") AS "tenure_start_date",
    "max"("p"."created_at") AS "last_payment_date",
    "count"("p"."id") FILTER (WHERE ("p"."status" = 'succeeded'::"public"."enum_user_payments_status")) AS "total_successful_payments",
    COALESCE("sum"("p"."amount") FILTER (WHERE ("p"."status" = 'succeeded'::"public"."enum_user_payments_status")), (0)::numeric) AS "lifetime_payment_total",
    (EXISTS ( SELECT 1
           FROM "public"."payout_management" "pm"
          WHERE (("pm"."membership_id" = "um"."id") AND ("pm"."status" = 'completed'::"text")))) AS "has_received_payout",
    "row_number"() OVER (ORDER BY ("min"("p"."created_at")), "um"."id") AS "queue_position",
    ("s"."status" = 'active'::"public"."enum_user_subscriptions_status") AS "is_eligible",
    ("count"("p"."id") FILTER (WHERE ("p"."status" = 'succeeded'::"public"."enum_user_payments_status")) >= 12) AS "meets_time_requirement",
    "now"() AS "calculated_at"
   FROM (((("public"."user_memberships" "um"
     JOIN "public"."users" "u" ON (("u"."id" = "um"."user_id")))
     JOIN "public"."user_subscriptions" "s" ON (("s"."id" = "um"."subscription_id")))
     JOIN "public"."user_payments" "p" ON (("p"."subscription_id" = "s"."id")))
     LEFT JOIN "public"."user_profiles" "up" ON (("up"."user_id" = "u"."id")))
  WHERE (("s"."status" = 'active'::"public"."enum_user_subscriptions_status") AND ("p"."status" = 'succeeded'::"public"."enum_user_payments_status") AND ("p"."amount" > (0)::numeric) AND (NOT (EXISTS ( SELECT 1
           FROM "public"."payout_management" "pm"
          WHERE (("pm"."membership_id" = "um"."id") AND ("pm"."status" = 'completed'::"text"))))))
  GROUP BY "um"."id", "u"."id", "u"."email", "u"."created_at", "up"."first_name", "up"."last_name", "up"."middle_name", "s"."id", "s"."status", "s"."provider_subscription_id", "um"."join_date", "um"."verification_status"
  ORDER BY ("min"("p"."created_at")), "um"."id"
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."active_member_queue_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin" (
    "id" integer NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "email" character varying NOT NULL,
    "reset_password_token" character varying,
    "reset_password_expiration" timestamp with time zone,
    "salt" character varying,
    "hash" character varying,
    "login_attempts" numeric DEFAULT 0,
    "lock_until" timestamp with time zone,
    "role" "text" DEFAULT 'Manager'::"text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text",
    "name" "text"
);


ALTER TABLE "public"."admin" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_alerts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "alert_id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "severity" "text" DEFAULT 'info'::"text" NOT NULL,
    "category" "text" NOT NULL,
    "status" "text" DEFAULT 'new'::"text" NOT NULL,
    "related_entity" "jsonb",
    "trigger_info" "jsonb",
    "assigned_to" integer,
    "acknowledged_by" integer,
    "acknowledged_at" timestamp with time zone,
    "resolved_by" integer,
    "resolved_at" timestamp with time zone,
    "resolution_notes" "text",
    "notifications_sent" "jsonb" DEFAULT '[]'::"jsonb",
    "escalation" "jsonb",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."admin_alerts" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."admin_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."admin_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."admin_id_seq" OWNED BY "public"."admin"."id";



CREATE TABLE IF NOT EXISTS "public"."admin_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_id" "uuid" NOT NULL,
    "session_token" "text" NOT NULL,
    "ip_address" "text",
    "user_agent" "text",
    "expires_at" timestamp with time zone NOT NULL,
    "last_activity" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."admin_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."disputes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "dispute_id" "text" NOT NULL,
    "payment_id" "uuid",
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "status" "text" DEFAULT 'needs_response'::"text" NOT NULL,
    "reason" "text" NOT NULL,
    "amount" numeric NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text",
    "stripe_dispute_id" "text",
    "customer_message" "text",
    "respond_by" timestamp with time zone NOT NULL,
    "evidence" "jsonb" DEFAULT '{}'::"jsonb",
    "assigned_to" integer,
    "internal_notes" "jsonb" DEFAULT '[]'::"jsonb",
    "resolution" "jsonb",
    "impact" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."disputes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."kyc_verification" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "verification_method" "text",
    "document_type" "text",
    "document_number" "text",
    "document_front_url" "text",
    "document_back_url" "text",
    "selfie_url" "text",
    "verification_provider" "text",
    "provider_verification_id" "text",
    "verification_data" "jsonb" DEFAULT '{}'::"jsonb",
    "verified_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "rejection_reason" "text",
    "reviewer_id" integer,
    "reviewer_notes" "text",
    "risk_score" integer,
    "risk_factors" "jsonb" DEFAULT '[]'::"jsonb",
    "ip_address" "text",
    "user_agent" "text",
    "geolocation" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."kyc_verification" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."membership_queue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "queue_position" integer,
    "joined_queue_at" timestamp with time zone DEFAULT "now"(),
    "is_eligible" boolean DEFAULT true,
    "priority_score" integer DEFAULT 0,
    "subscription_active" boolean DEFAULT false,
    "total_months_subscribed" integer DEFAULT 0,
    "last_payment_date" timestamp with time zone,
    "lifetime_payment_total" numeric(10,2) DEFAULT 0.00,
    "has_received_payout" boolean DEFAULT false,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."membership_queue" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "logo" "text",
    "metadata" "text",
    "createdAt" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."organization" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_invitation" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organizationId" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "role" character varying(20) DEFAULT 'member'::character varying NOT NULL,
    "inviterId" "uuid" NOT NULL,
    "status" character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    "token" "text" NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    "createdAt" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."organization_invitation" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_member" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organizationId" "uuid" NOT NULL,
    "userId" "uuid" NOT NULL,
    "role" character varying(20) DEFAULT 'member'::character varying NOT NULL,
    "createdAt" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."organization_member" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."passkey" (
    "id" "text" NOT NULL,
    "name" "text",
    "public_key" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "webauthn_user_id" "text" NOT NULL,
    "counter" integer DEFAULT 0 NOT NULL,
    "device_type" "text" NOT NULL,
    "backed_up" boolean DEFAULT false NOT NULL,
    "transports" "text",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "credentialID" "text"
);


ALTER TABLE "public"."passkey" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payload_locked_documents" (
    "id" integer NOT NULL,
    "global_slug" character varying,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."payload_locked_documents" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."payload_locked_documents_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."payload_locked_documents_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."payload_locked_documents_id_seq" OWNED BY "public"."payload_locked_documents"."id";



CREATE TABLE IF NOT EXISTS "public"."payload_locked_documents_rels" (
    "id" integer NOT NULL,
    "order" integer,
    "parent_id" integer NOT NULL,
    "path" character varying NOT NULL,
    "admin_id" integer,
    "users_id" integer
);


ALTER TABLE "public"."payload_locked_documents_rels" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."payload_locked_documents_rels_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."payload_locked_documents_rels_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."payload_locked_documents_rels_id_seq" OWNED BY "public"."payload_locked_documents_rels"."id";



CREATE TABLE IF NOT EXISTS "public"."payload_migrations" (
    "id" integer NOT NULL,
    "name" character varying,
    "batch" numeric,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."payload_migrations" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."payload_migrations_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."payload_migrations_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."payload_migrations_id_seq" OWNED BY "public"."payload_migrations"."id";



CREATE TABLE IF NOT EXISTS "public"."payload_preferences" (
    "id" integer NOT NULL,
    "key" character varying,
    "value" "jsonb",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."payload_preferences" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."payload_preferences_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."payload_preferences_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."payload_preferences_id_seq" OWNED BY "public"."payload_preferences"."id";



CREATE TABLE IF NOT EXISTS "public"."payload_preferences_rels" (
    "id" integer NOT NULL,
    "order" integer,
    "parent_id" integer NOT NULL,
    "path" character varying NOT NULL,
    "admin_id" integer
);


ALTER TABLE "public"."payload_preferences_rels" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."payload_preferences_rels_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."payload_preferences_rels_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."payload_preferences_rels_id_seq" OWNED BY "public"."payload_preferences_rels"."id";



CREATE TABLE IF NOT EXISTS "public"."session" (
    "id" "text" NOT NULL,
    "expires_at" timestamp without time zone NOT NULL,
    "ip_address" "text",
    "user_agent" "text",
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "token" "text" NOT NULL,
    "updated_at" timestamp without time zone NOT NULL,
    "active_organization_id" "text",
    "user_id" "uuid" NOT NULL
);


ALTER TABLE "public"."session" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "admin_id" integer,
    "entity_type" character varying(50) NOT NULL,
    "entity_id" "uuid",
    "action" character varying(50) NOT NULL,
    "old_values" "jsonb",
    "new_values" "jsonb",
    "success" boolean NOT NULL,
    "error_message" "text",
    "ip_address" "inet",
    "user_agent" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."system_audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tax_forms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "form_id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "form_type" "text" NOT NULL,
    "tax_year" integer NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "recipient_info" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "payer_info" "jsonb" DEFAULT '{}'::"jsonb",
    "income_details" "jsonb" DEFAULT '{}'::"jsonb",
    "w9_data" "jsonb" DEFAULT '{}'::"jsonb",
    "generation" "jsonb" DEFAULT '{}'::"jsonb",
    "delivery" "jsonb" DEFAULT '{}'::"jsonb",
    "irs_filing" "jsonb" DEFAULT '{}'::"jsonb",
    "corrections" "jsonb" DEFAULT '[]'::"jsonb",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tax_forms" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transaction_monitoring" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "transaction_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "transaction_type" "text" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text",
    "risk_level" "text" DEFAULT 'low'::"text" NOT NULL,
    "risk_score" integer,
    "status" "text" DEFAULT 'pending_review'::"text" NOT NULL,
    "flags" "jsonb" DEFAULT '[]'::"jsonb",
    "aml_check" "jsonb" DEFAULT '{}'::"jsonb",
    "velocity_check" "jsonb" DEFAULT '{}'::"jsonb",
    "device_fingerprint" "jsonb" DEFAULT '{}'::"jsonb",
    "geographic_data" "jsonb" DEFAULT '{}'::"jsonb",
    "reviewer_id" integer,
    "reviewer_notes" "text",
    "reviewed_at" timestamp with time zone,
    "action_taken" "text",
    "sar_filed" boolean DEFAULT false,
    "sar_filed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."transaction_monitoring" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."two_factor" (
    "id" "text" NOT NULL,
    "secret" "text" NOT NULL,
    "backup_codes" "text" NOT NULL,
    "user_id" "uuid" NOT NULL
);


ALTER TABLE "public"."two_factor" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_addresses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "address_type" character varying(20) DEFAULT 'primary'::character varying,
    "street_address" character varying(255) NOT NULL,
    "address_line_2" character varying(255),
    "city" character varying(100) NOT NULL,
    "state" character varying(100) NOT NULL,
    "postal_code" character varying(20) NOT NULL,
    "country_code" character varying(2) DEFAULT 'US'::character varying,
    "is_primary" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_addresses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_agreements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "agreement_type" character varying(50) NOT NULL,
    "version_number" character varying(20) NOT NULL,
    "agreed_at" timestamp with time zone DEFAULT "now"(),
    "ip_address" "text",
    "user_agent" "text",
    "document_url" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_agreements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_appearance_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "theme" "text" DEFAULT 'light'::"text",
    "accent_color" "text" DEFAULT 'blue'::"text",
    "language" "text" DEFAULT 'en'::"text",
    "timezone" "text" DEFAULT 'UTC'::"text",
    "date_format" "text" DEFAULT 'MM/DD/YYYY'::"text",
    "time_format" "text" DEFAULT '12'::"text",
    "font_size" "text" DEFAULT 'medium'::"text",
    "compact_mode" boolean DEFAULT false,
    "show_animations" boolean DEFAULT true,
    "reduce_motion" boolean DEFAULT false,
    "dashboard_layout" "text" DEFAULT 'default'::"text",
    "sidebar_collapsed" boolean DEFAULT false,
    "show_tooltips" boolean DEFAULT true,
    "notification_position" "text" DEFAULT 'top-right'::"text",
    "notification_duration" integer DEFAULT 5000
);


ALTER TABLE "public"."user_appearance_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_appearance_settings" IS 'UI/UX appearance and localization preferences';



CREATE TABLE IF NOT EXISTS "public"."user_audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "admin_id" integer,
    "entity_type" character varying NOT NULL,
    "entity_id" "uuid",
    "action" character varying NOT NULL,
    "old_values" "jsonb",
    "new_values" "jsonb",
    "success" boolean NOT NULL,
    "error_message" "text",
    "ip_address" "inet",
    "user_agent" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_billing_schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "subscription_id" "uuid",
    "billing_cycle" character varying(20) DEFAULT 'MONTHLY'::character varying,
    "next_billing_date" timestamp without time zone,
    "amount" numeric(10,2),
    "currency" character(3) DEFAULT 'USD'::"bpchar",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_billing_schedules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_contacts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "contact_type" character varying(20) NOT NULL,
    "contact_value" character varying(255) NOT NULL,
    "is_primary" boolean DEFAULT false,
    "is_verified" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_contacts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_notification_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "email_payment_reminders" boolean DEFAULT true,
    "email_tenure_updates" boolean DEFAULT true,
    "email_security_alerts" boolean DEFAULT true,
    "email_system_updates" boolean DEFAULT false,
    "email_newsletter" boolean DEFAULT false,
    "sms_payment_reminders" boolean DEFAULT false,
    "sms_security_alerts" boolean DEFAULT true,
    "sms_urgent_updates" boolean DEFAULT true,
    "push_payment_reminders" boolean DEFAULT true,
    "push_tenure_updates" boolean DEFAULT true,
    "push_security_alerts" boolean DEFAULT true,
    "push_system_updates" boolean DEFAULT false,
    "email_frequency" "text" DEFAULT 'immediate'::"text",
    "sms_frequency" "text" DEFAULT 'urgent_only'::"text",
    "push_frequency" "text" DEFAULT 'immediate'::"text"
);


ALTER TABLE "public"."user_notification_preferences" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_notification_preferences" IS 'Detailed notification preferences for different types of alerts';



CREATE TABLE IF NOT EXISTS "public"."user_payment_methods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "provider" character varying(20) DEFAULT 'stripe'::character varying NOT NULL,
    "method_type" character varying(20) NOT NULL,
    "method_subtype" character varying(20),
    "provider_payment_method_id" "text",
    "last_four" character varying(4),
    "brand" character varying(20),
    "expires_month" integer,
    "expires_year" integer,
    "is_default" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_payment_methods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_payment_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "auto_renewal" boolean DEFAULT true,
    "payment_method" "text" DEFAULT 'card'::"text",
    "billing_cycle" "text" DEFAULT 'monthly'::"text",
    "billing_address" "jsonb",
    "tax_id" "text",
    "saved_payment_methods" "jsonb" DEFAULT '[]'::"jsonb",
    "default_payment_method_id" "text",
    "invoice_delivery" "text" DEFAULT 'email'::"text",
    "payment_reminders" boolean DEFAULT true,
    "payment_reminder_days" integer DEFAULT 3,
    "currency" "text" DEFAULT 'USD'::"text",
    "tax_rate" numeric(5,4) DEFAULT 0.0000
);


ALTER TABLE "public"."user_payment_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_payment_settings" IS 'Payment method and billing preferences';



CREATE TABLE IF NOT EXISTS "public"."user_privacy_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "profile_visibility" "text" DEFAULT 'private'::"text",
    "show_tenure_months" boolean DEFAULT true,
    "show_join_date" boolean DEFAULT true,
    "show_activity_status" boolean DEFAULT true,
    "data_sharing" boolean DEFAULT false,
    "analytics_consent" boolean DEFAULT false,
    "marketing_consent" boolean DEFAULT false,
    "third_party_sharing" boolean DEFAULT false,
    "show_email" boolean DEFAULT false,
    "show_phone" boolean DEFAULT false,
    "show_address" boolean DEFAULT false,
    "show_login_activity" boolean DEFAULT false,
    "show_payment_history" boolean DEFAULT false,
    "show_tenure_progress" boolean DEFAULT true,
    "searchable" boolean DEFAULT true,
    "appear_in_leaderboards" boolean DEFAULT true,
    "show_in_member_directory" boolean DEFAULT false,
    "data_retention_period" integer DEFAULT 365,
    "auto_delete_inactive" boolean DEFAULT false,
    "inactive_period" integer DEFAULT 730
);


ALTER TABLE "public"."user_privacy_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_privacy_settings" IS 'Privacy and data sharing preferences';



CREATE TABLE IF NOT EXISTS "public"."user_security_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "two_factor_enabled" boolean DEFAULT false,
    "two_factor_secret" "text",
    "two_factor_backup_codes" "text"[],
    "two_factor_last_used" timestamp with time zone,
    "login_alerts" boolean DEFAULT true,
    "session_timeout" integer DEFAULT 30,
    "max_concurrent_sessions" integer DEFAULT 3,
    "password_last_changed" timestamp with time zone,
    "password_strength_score" integer DEFAULT 0,
    "require_password_change" boolean DEFAULT false,
    "trusted_devices" "jsonb" DEFAULT '[]'::"jsonb",
    "device_fingerprint_required" boolean DEFAULT false,
    "security_questions" "jsonb" DEFAULT '[]'::"jsonb"
);


ALTER TABLE "public"."user_security_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_security_settings" IS 'Security-related settings including 2FA and login preferences';



CREATE TABLE IF NOT EXISTS "public"."user_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "email_notifications" boolean DEFAULT true,
    "sms_notifications" boolean DEFAULT false,
    "push_notifications" boolean DEFAULT true,
    "marketing_emails" boolean DEFAULT false,
    "two_factor_auth" boolean DEFAULT false,
    "two_factor_secret" "text",
    "login_alerts" boolean DEFAULT true,
    "session_timeout" integer DEFAULT 30,
    "profile_visibility" "text" DEFAULT 'private'::"text",
    "data_sharing" boolean DEFAULT false,
    "theme" "text" DEFAULT 'light'::"text",
    "language" "text" DEFAULT 'en'::"text",
    "auto_renewal" boolean DEFAULT true,
    "payment_method" "text" DEFAULT 'card'::"text",
    "billing_cycle" "text" DEFAULT 'monthly'::"text",
    "timezone" "text" DEFAULT 'UTC'::"text",
    "date_format" "text" DEFAULT 'MM/DD/YYYY'::"text",
    "currency" "text" DEFAULT 'USD'::"text"
);


ALTER TABLE "public"."user_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_settings" IS 'Main user settings table containing general preferences';



CREATE TABLE IF NOT EXISTS "public"."verification" (
    "id" "text" NOT NULL,
    "identifier" "text" NOT NULL,
    "value" "text" NOT NULL,
    "expires_at" timestamp without time zone NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."verification" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."verification_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" character varying(255) NOT NULL,
    "code" character varying(6) NOT NULL,
    "link_token" character varying(64) NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "used" boolean DEFAULT false,
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."verification_codes" OWNER TO "postgres";


ALTER TABLE ONLY "public"."admin" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."admin_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."payload_locked_documents" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."payload_locked_documents_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."payload_locked_documents_rels" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."payload_locked_documents_rels_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."payload_migrations" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."payload_migrations_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."payload_preferences" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."payload_preferences_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."payload_preferences_rels" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."payload_preferences_rels_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."account"
    ADD CONSTRAINT "account_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_alerts"
    ADD CONSTRAINT "admin_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin"
    ADD CONSTRAINT "admin_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_sessions"
    ADD CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_sessions"
    ADD CONSTRAINT "admin_sessions_session_token_key" UNIQUE ("session_token");



ALTER TABLE ONLY "public"."disputes"
    ADD CONSTRAINT "disputes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."kyc_verification"
    ADD CONSTRAINT "kyc_verification_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."membership_queue"
    ADD CONSTRAINT "membership_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."membership_queue"
    ADD CONSTRAINT "membership_queue_user_id_unique" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."organization_invitation"
    ADD CONSTRAINT "organization_invitation_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_invitation"
    ADD CONSTRAINT "organization_invitation_token_unique" UNIQUE ("token");



ALTER TABLE ONLY "public"."organization_member"
    ADD CONSTRAINT "organization_member_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization"
    ADD CONSTRAINT "organization_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization"
    ADD CONSTRAINT "organization_slug_unique" UNIQUE ("slug");



ALTER TABLE ONLY "public"."passkey"
    ADD CONSTRAINT "passkey_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payload_locked_documents"
    ADD CONSTRAINT "payload_locked_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payload_locked_documents_rels"
    ADD CONSTRAINT "payload_locked_documents_rels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payload_migrations"
    ADD CONSTRAINT "payload_migrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payload_preferences"
    ADD CONSTRAINT "payload_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payload_preferences_rels"
    ADD CONSTRAINT "payload_preferences_rels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payout_management"
    ADD CONSTRAINT "payout_management_payout_id_unique" UNIQUE ("payout_id");



ALTER TABLE ONLY "public"."payout_management"
    ADD CONSTRAINT "payout_management_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session"
    ADD CONSTRAINT "session_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session"
    ADD CONSTRAINT "session_token_unique" UNIQUE ("token");



ALTER TABLE ONLY "public"."system_audit_logs"
    ADD CONSTRAINT "system_audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tax_forms"
    ADD CONSTRAINT "tax_forms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transaction_monitoring"
    ADD CONSTRAINT "transaction_monitoring_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."two_factor"
    ADD CONSTRAINT "two_factor_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_addresses"
    ADD CONSTRAINT "user_addresses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_agreements"
    ADD CONSTRAINT "user_agreements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_agreements"
    ADD CONSTRAINT "user_agreements_user_id_agreement_type_version_number_key" UNIQUE ("user_id", "agreement_type", "version_number");



ALTER TABLE ONLY "public"."user_appearance_settings"
    ADD CONSTRAINT "user_appearance_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_appearance_settings"
    ADD CONSTRAINT "user_appearance_settings_user_id_unique" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_audit_logs"
    ADD CONSTRAINT "user_audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_billing_schedules"
    ADD CONSTRAINT "user_billing_schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_contacts"
    ADD CONSTRAINT "user_contacts_contact_value_key" UNIQUE ("contact_value");



ALTER TABLE ONLY "public"."user_contacts"
    ADD CONSTRAINT "user_contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_contacts"
    ADD CONSTRAINT "user_contacts_user_id_contact_type_contact_value_key" UNIQUE ("user_id", "contact_type", "contact_value");



ALTER TABLE ONLY "public"."user_memberships"
    ADD CONSTRAINT "user_memberships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_memberships"
    ADD CONSTRAINT "user_memberships_subscription_id_unique" UNIQUE ("subscription_id");



ALTER TABLE ONLY "public"."user_notification_preferences"
    ADD CONSTRAINT "user_notification_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_notification_preferences"
    ADD CONSTRAINT "user_notification_preferences_user_id_unique" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_payment_methods"
    ADD CONSTRAINT "user_payment_methods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_payment_methods"
    ADD CONSTRAINT "user_payment_methods_user_id_provider_payment_method_id_key" UNIQUE ("user_id", "provider_payment_method_id");



ALTER TABLE ONLY "public"."user_payment_settings"
    ADD CONSTRAINT "user_payment_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_payment_settings"
    ADD CONSTRAINT "user_payment_settings_user_id_unique" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_payments"
    ADD CONSTRAINT "user_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_privacy_settings"
    ADD CONSTRAINT "user_privacy_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_privacy_settings"
    ADD CONSTRAINT "user_privacy_settings_user_id_unique" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_security_settings"
    ADD CONSTRAINT "user_security_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_security_settings"
    ADD CONSTRAINT "user_security_settings_user_id_unique" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_user_id_unique" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_subscriptions"
    ADD CONSTRAINT "user_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."verification_codes"
    ADD CONSTRAINT "verification_codes_link_token_unique" UNIQUE ("link_token");



ALTER TABLE ONLY "public"."verification_codes"
    ADD CONSTRAINT "verification_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."verification"
    ADD CONSTRAINT "verification_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_admin_alerts_alert_id" ON "public"."admin_alerts" USING "btree" ("alert_id");



CREATE INDEX "idx_admin_alerts_assigned_to" ON "public"."admin_alerts" USING "btree" ("assigned_to");



CREATE INDEX "idx_admin_alerts_severity" ON "public"."admin_alerts" USING "btree" ("severity");



CREATE INDEX "idx_admin_alerts_status" ON "public"."admin_alerts" USING "btree" ("status");



CREATE INDEX "idx_admin_email" ON "public"."admin" USING "btree" ("email");



CREATE INDEX "idx_admin_sessions_admin_id" ON "public"."admin_sessions" USING "btree" ("admin_id");



CREATE INDEX "idx_admin_sessions_expires_at" ON "public"."admin_sessions" USING "btree" ("expires_at");



CREATE INDEX "idx_admin_sessions_is_active" ON "public"."admin_sessions" USING "btree" ("is_active");



CREATE INDEX "idx_admin_sessions_session_token" ON "public"."admin_sessions" USING "btree" ("session_token");



CREATE INDEX "idx_disputes_dispute_id" ON "public"."disputes" USING "btree" ("dispute_id");



CREATE INDEX "idx_disputes_status" ON "public"."disputes" USING "btree" ("status");



CREATE INDEX "idx_disputes_type" ON "public"."disputes" USING "btree" ("type");



CREATE INDEX "idx_disputes_user_id" ON "public"."disputes" USING "btree" ("user_id");



CREATE INDEX "idx_kyc_verification_status" ON "public"."kyc_verification" USING "btree" ("status");



CREATE INDEX "idx_kyc_verification_user_id" ON "public"."kyc_verification" USING "btree" ("user_id");



CREATE INDEX "idx_membership_queue_eligible" ON "public"."membership_queue" USING "btree" ("is_eligible");



CREATE INDEX "idx_membership_queue_position" ON "public"."membership_queue" USING "btree" ("queue_position");



CREATE INDEX "idx_membership_queue_user_id" ON "public"."membership_queue" USING "btree" ("user_id");



CREATE INDEX "idx_organization_invitation_email" ON "public"."organization_invitation" USING "btree" ("email");



CREATE INDEX "idx_organization_invitation_org_id" ON "public"."organization_invitation" USING "btree" ("organizationId");



CREATE INDEX "idx_organization_invitation_status" ON "public"."organization_invitation" USING "btree" ("status");



CREATE INDEX "idx_organization_invitation_token" ON "public"."organization_invitation" USING "btree" ("token");



CREATE INDEX "idx_organization_member_org_id" ON "public"."organization_member" USING "btree" ("organizationId");



CREATE INDEX "idx_organization_member_role" ON "public"."organization_member" USING "btree" ("role");



CREATE INDEX "idx_organization_member_user_id" ON "public"."organization_member" USING "btree" ("userId");



CREATE INDEX "idx_organization_slug" ON "public"."organization" USING "btree" ("slug");



CREATE INDEX "idx_passkey_user_id" ON "public"."passkey" USING "btree" ("user_id");



CREATE INDEX "idx_payload_locked_documents_global_slug" ON "public"."payload_locked_documents" USING "btree" ("global_slug");



CREATE INDEX "idx_payload_locked_documents_rels_admin_id" ON "public"."payload_locked_documents_rels" USING "btree" ("admin_id");



CREATE INDEX "idx_payload_locked_documents_rels_parent_id" ON "public"."payload_locked_documents_rels" USING "btree" ("parent_id");



CREATE INDEX "idx_payload_locked_documents_rels_path" ON "public"."payload_locked_documents_rels" USING "btree" ("path");



CREATE INDEX "idx_payload_locked_documents_rels_users_id" ON "public"."payload_locked_documents_rels" USING "btree" ("users_id");



CREATE INDEX "idx_payload_preferences_key" ON "public"."payload_preferences" USING "btree" ("key");



CREATE INDEX "idx_payload_preferences_rels_admin_id" ON "public"."payload_preferences_rels" USING "btree" ("admin_id");



CREATE INDEX "idx_payload_preferences_rels_parent_id" ON "public"."payload_preferences_rels" USING "btree" ("parent_id");



CREATE INDEX "idx_payload_preferences_rels_path" ON "public"."payload_preferences_rels" USING "btree" ("path");



CREATE INDEX "idx_payout_management_membership_id" ON "public"."payout_management" USING "btree" ("membership_id");



CREATE INDEX "idx_payout_management_status" ON "public"."payout_management" USING "btree" ("status");



CREATE INDEX "idx_payout_management_user_id" ON "public"."payout_management" USING "btree" ("user_id");



CREATE INDEX "idx_payout_management_user_status" ON "public"."payout_management" USING "btree" ("user_id", "status") WHERE ("status" = 'completed'::"text");



CREATE INDEX "idx_queue_matview_eligible" ON "public"."active_member_queue_view" USING "btree" ("is_eligible", "queue_position");



CREATE UNIQUE INDEX "idx_queue_matview_membership_id" ON "public"."active_member_queue_view" USING "btree" ("membership_id");



CREATE INDEX "idx_queue_matview_position" ON "public"."active_member_queue_view" USING "btree" ("queue_position");



CREATE INDEX "idx_queue_matview_tenure" ON "public"."active_member_queue_view" USING "btree" ("tenure_start_date");



CREATE INDEX "idx_queue_matview_user_id" ON "public"."active_member_queue_view" USING "btree" ("user_id");



CREATE INDEX "idx_system_audit_logs_action" ON "public"."system_audit_logs" USING "btree" ("action");



CREATE INDEX "idx_system_audit_logs_created_at" ON "public"."system_audit_logs" USING "btree" ("created_at");



CREATE INDEX "idx_system_audit_logs_entity" ON "public"."system_audit_logs" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_system_audit_logs_success" ON "public"."system_audit_logs" USING "btree" ("success");



CREATE INDEX "idx_system_audit_logs_user_id" ON "public"."system_audit_logs" USING "btree" ("user_id");



CREATE INDEX "idx_tax_forms_form_id" ON "public"."tax_forms" USING "btree" ("form_id");



CREATE INDEX "idx_tax_forms_form_type" ON "public"."tax_forms" USING "btree" ("form_type");



CREATE INDEX "idx_tax_forms_status" ON "public"."tax_forms" USING "btree" ("status");



CREATE INDEX "idx_tax_forms_tax_year" ON "public"."tax_forms" USING "btree" ("tax_year");



CREATE INDEX "idx_tax_forms_user_id" ON "public"."tax_forms" USING "btree" ("user_id");



CREATE INDEX "idx_transaction_monitoring_risk_level" ON "public"."transaction_monitoring" USING "btree" ("risk_level");



CREATE INDEX "idx_transaction_monitoring_status" ON "public"."transaction_monitoring" USING "btree" ("status");



CREATE INDEX "idx_transaction_monitoring_transaction_id" ON "public"."transaction_monitoring" USING "btree" ("transaction_id");



CREATE INDEX "idx_transaction_monitoring_user_id" ON "public"."transaction_monitoring" USING "btree" ("user_id");



CREATE INDEX "idx_user_addresses_primary" ON "public"."user_addresses" USING "btree" ("user_id", "is_primary");



CREATE INDEX "idx_user_addresses_user_id" ON "public"."user_addresses" USING "btree" ("user_id");



CREATE INDEX "idx_user_agreements_type" ON "public"."user_agreements" USING "btree" ("agreement_type");



CREATE INDEX "idx_user_agreements_user_id" ON "public"."user_agreements" USING "btree" ("user_id");



CREATE INDEX "idx_user_appearance_settings_user_id" ON "public"."user_appearance_settings" USING "btree" ("user_id");



CREATE INDEX "idx_user_audit_logs_action" ON "public"."user_audit_logs" USING "btree" ("action");



CREATE INDEX "idx_user_audit_logs_created_at" ON "public"."user_audit_logs" USING "btree" ("created_at");



CREATE INDEX "idx_user_audit_logs_entity_type" ON "public"."user_audit_logs" USING "btree" ("entity_type");



CREATE INDEX "idx_user_audit_logs_user_id" ON "public"."user_audit_logs" USING "btree" ("user_id");



CREATE INDEX "idx_user_billing_schedules_next_billing" ON "public"."user_billing_schedules" USING "btree" ("next_billing_date");



CREATE INDEX "idx_user_billing_schedules_user_id" ON "public"."user_billing_schedules" USING "btree" ("user_id");



CREATE INDEX "idx_user_contacts_primary" ON "public"."user_contacts" USING "btree" ("user_id", "is_primary");



CREATE INDEX "idx_user_contacts_type" ON "public"."user_contacts" USING "btree" ("contact_type");



CREATE INDEX "idx_user_contacts_user_id" ON "public"."user_contacts" USING "btree" ("user_id");



CREATE INDEX "idx_user_memberships_join_date" ON "public"."user_memberships" USING "btree" ("join_date");



CREATE INDEX "idx_user_memberships_subscription_id" ON "public"."user_memberships" USING "btree" ("subscription_id");



CREATE INDEX "idx_user_memberships_user_id" ON "public"."user_memberships" USING "btree" ("user_id");



CREATE INDEX "idx_user_notification_preferences_user_id" ON "public"."user_notification_preferences" USING "btree" ("user_id");



CREATE INDEX "idx_user_payment_methods_active" ON "public"."user_payment_methods" USING "btree" ("user_id", "is_active");



CREATE INDEX "idx_user_payment_methods_default" ON "public"."user_payment_methods" USING "btree" ("user_id", "is_default");



CREATE INDEX "idx_user_payment_methods_user_id" ON "public"."user_payment_methods" USING "btree" ("user_id");



CREATE INDEX "idx_user_payment_settings_user_id" ON "public"."user_payment_settings" USING "btree" ("user_id");



CREATE INDEX "idx_user_payments_created_at_status" ON "public"."user_payments" USING "btree" ("created_at", "status") WHERE ("status" = 'succeeded'::"public"."enum_user_payments_status");



CREATE INDEX "idx_user_payments_date" ON "public"."user_payments" USING "btree" ("payment_date");



CREATE INDEX "idx_user_payments_status" ON "public"."user_payments" USING "btree" ("status");



CREATE INDEX "idx_user_payments_subscription_id" ON "public"."user_payments" USING "btree" ("subscription_id");



CREATE INDEX "idx_user_payments_user_id" ON "public"."user_payments" USING "btree" ("user_id");



CREATE INDEX "idx_user_payments_user_status_date" ON "public"."user_payments" USING "btree" ("user_id", "status", "created_at") WHERE (("status" = 'succeeded'::"public"."enum_user_payments_status") AND ("amount" > (0)::numeric));



CREATE INDEX "idx_user_privacy_settings_user_id" ON "public"."user_privacy_settings" USING "btree" ("user_id");



CREATE INDEX "idx_user_profiles_name" ON "public"."user_profiles" USING "btree" ("first_name", "last_name");



CREATE INDEX "idx_user_profiles_names" ON "public"."user_profiles" USING "btree" ("first_name", "last_name");



CREATE INDEX "idx_user_profiles_user_id" ON "public"."user_profiles" USING "btree" ("user_id");



CREATE INDEX "idx_user_security_settings_user_id" ON "public"."user_security_settings" USING "btree" ("user_id");



CREATE INDEX "idx_user_settings_user_id" ON "public"."user_settings" USING "btree" ("user_id");



CREATE INDEX "idx_user_subscriptions_provider_id" ON "public"."user_subscriptions" USING "btree" ("provider_subscription_id");



CREATE INDEX "idx_user_subscriptions_status" ON "public"."user_subscriptions" USING "btree" ("status");



CREATE INDEX "idx_user_subscriptions_status_active" ON "public"."user_subscriptions" USING "btree" ("status") WHERE ("status" = 'active'::"public"."enum_user_subscriptions_status");



CREATE INDEX "idx_user_subscriptions_user_id" ON "public"."user_subscriptions" USING "btree" ("user_id");



CREATE INDEX "idx_users_email" ON "public"."users" USING "btree" ("email");



CREATE INDEX "idx_users_email_verified" ON "public"."users" USING "btree" ("email_verified");



CREATE INDEX "idx_users_name" ON "public"."users" USING "btree" ("name");



CREATE INDEX "idx_users_two_factor" ON "public"."users" USING "btree" ("two_factor_enabled");



CREATE INDEX "idx_users_updated_at" ON "public"."users" USING "btree" ("updated_at");



CREATE INDEX "idx_verification_codes_code" ON "public"."verification_codes" USING "btree" ("code");



CREATE INDEX "idx_verification_codes_email" ON "public"."verification_codes" USING "btree" ("email");



CREATE INDEX "idx_verification_codes_expires_at" ON "public"."verification_codes" USING "btree" ("expires_at");



CREATE INDEX "idx_verification_codes_link_token" ON "public"."verification_codes" USING "btree" ("link_token");



CREATE INDEX "idx_verification_codes_user_id" ON "public"."verification_codes" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "auto_assign_queue_position" BEFORE INSERT ON "public"."membership_queue" FOR EACH ROW EXECUTE FUNCTION "public"."assign_queue_position"();



CREATE OR REPLACE TRIGGER "payout_completion_notify" AFTER INSERT OR UPDATE ON "public"."payout_management" FOR EACH ROW WHEN (("new"."status" = 'completed'::"text")) EXECUTE FUNCTION "public"."notify_queue_refresh"();



CREATE OR REPLACE TRIGGER "subscription_status_notify" AFTER UPDATE ON "public"."user_subscriptions" FOR EACH ROW WHEN (("old"."status" IS DISTINCT FROM "new"."status")) EXECUTE FUNCTION "public"."notify_queue_refresh"();



CREATE OR REPLACE TRIGGER "update_membership_queue_updated_at" BEFORE UPDATE ON "public"."membership_queue" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_addresses_updated_at" BEFORE UPDATE ON "public"."user_addresses" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_appearance_settings_updated_at" BEFORE UPDATE ON "public"."user_appearance_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_billing_schedules_updated_at" BEFORE UPDATE ON "public"."user_billing_schedules" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_contacts_updated_at" BEFORE UPDATE ON "public"."user_contacts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_memberships_updated_at" BEFORE UPDATE ON "public"."user_memberships" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_notification_preferences_updated_at" BEFORE UPDATE ON "public"."user_notification_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_payment_methods_updated_at" BEFORE UPDATE ON "public"."user_payment_methods" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_payment_settings_updated_at" BEFORE UPDATE ON "public"."user_payment_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_payments_updated_at" BEFORE UPDATE ON "public"."user_payments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_privacy_settings_updated_at" BEFORE UPDATE ON "public"."user_privacy_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_profiles_updated_at" BEFORE UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_security_settings_updated_at" BEFORE UPDATE ON "public"."user_security_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_settings_updated_at" BEFORE UPDATE ON "public"."user_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_subscriptions_updated_at" BEFORE UPDATE ON "public"."user_subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."account"
    ADD CONSTRAINT "account_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."disputes"
    ADD CONSTRAINT "disputes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."kyc_verification"
    ADD CONSTRAINT "kyc_verification_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."membership_queue"
    ADD CONSTRAINT "membership_queue_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_invitation"
    ADD CONSTRAINT "organization_invitation_inviterId_users_id_fk" FOREIGN KEY ("inviterId") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_invitation"
    ADD CONSTRAINT "organization_invitation_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_member"
    ADD CONSTRAINT "organization_member_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_member"
    ADD CONSTRAINT "organization_member_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."passkey"
    ADD CONSTRAINT "passkey_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payout_management"
    ADD CONSTRAINT "payout_management_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "public"."user_memberships"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payout_management"
    ADD CONSTRAINT "payout_management_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."session"
    ADD CONSTRAINT "session_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."system_audit_logs"
    ADD CONSTRAINT "system_audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tax_forms"
    ADD CONSTRAINT "tax_forms_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transaction_monitoring"
    ADD CONSTRAINT "transaction_monitoring_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."two_factor"
    ADD CONSTRAINT "two_factor_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_addresses"
    ADD CONSTRAINT "user_addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_agreements"
    ADD CONSTRAINT "user_agreements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_appearance_settings"
    ADD CONSTRAINT "user_appearance_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_billing_schedules"
    ADD CONSTRAINT "user_billing_schedules_subscription_id_user_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."user_subscriptions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_billing_schedules"
    ADD CONSTRAINT "user_billing_schedules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_contacts"
    ADD CONSTRAINT "user_contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_memberships"
    ADD CONSTRAINT "user_memberships_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."user_subscriptions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_memberships"
    ADD CONSTRAINT "user_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_notification_preferences"
    ADD CONSTRAINT "user_notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_payment_methods"
    ADD CONSTRAINT "user_payment_methods_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_payment_settings"
    ADD CONSTRAINT "user_payment_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_payments"
    ADD CONSTRAINT "user_payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_privacy_settings"
    ADD CONSTRAINT "user_privacy_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_security_settings"
    ADD CONSTRAINT "user_security_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_subscriptions"
    ADD CONSTRAINT "user_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Allow all for authenticated users" ON "public"."admin_sessions" TO "authenticated" USING (true) WITH CHECK (true);





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."user_payments";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."user_subscriptions";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."users";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";














































































































































































GRANT ALL ON FUNCTION "public"."assign_queue_position"() TO "anon";
GRANT ALL ON FUNCTION "public"."assign_queue_position"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."assign_queue_position"() TO "service_role";



GRANT ALL ON FUNCTION "public"."can_issue_payouts"("p_company_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."can_issue_payouts"("p_company_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_issue_payouts"("p_company_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_signup_sessions"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_signup_sessions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_signup_sessions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_verification_codes"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_verification_codes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_verification_codes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."exec_sql"("sql_query" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."exec_sql"("sql_query" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."exec_sql"("sql_query" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_next_payout_winners"("p_company_id" bigint, "p_max_winners" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_next_payout_winners"("p_company_id" bigint, "p_max_winners" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_next_payout_winners"("p_company_id" bigint, "p_max_winners" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_queue_statistics"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_queue_statistics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_queue_statistics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_queue_position"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_queue_position"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_queue_position"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_profiles_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_profiles_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_profiles_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_queue_refresh"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_queue_refresh"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_queue_refresh"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_active_member_queue"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_active_member_queue"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_active_member_queue"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_active_member_queue_fast"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_active_member_queue_fast"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_active_member_queue_fast"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";
























GRANT ALL ON TABLE "public"."account" TO "anon";
GRANT ALL ON TABLE "public"."account" TO "authenticated";
GRANT ALL ON TABLE "public"."account" TO "service_role";



GRANT ALL ON TABLE "public"."payout_management" TO "anon";
GRANT ALL ON TABLE "public"."payout_management" TO "authenticated";
GRANT ALL ON TABLE "public"."payout_management" TO "service_role";



GRANT ALL ON TABLE "public"."user_memberships" TO "anon";
GRANT ALL ON TABLE "public"."user_memberships" TO "authenticated";
GRANT ALL ON TABLE "public"."user_memberships" TO "service_role";



GRANT ALL ON TABLE "public"."user_payments" TO "anon";
GRANT ALL ON TABLE "public"."user_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."user_payments" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."user_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."user_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."active_member_queue_view" TO "anon";
GRANT ALL ON TABLE "public"."active_member_queue_view" TO "authenticated";
GRANT ALL ON TABLE "public"."active_member_queue_view" TO "service_role";



GRANT ALL ON TABLE "public"."admin" TO "anon";
GRANT ALL ON TABLE "public"."admin" TO "authenticated";
GRANT ALL ON TABLE "public"."admin" TO "service_role";



GRANT ALL ON TABLE "public"."admin_alerts" TO "anon";
GRANT ALL ON TABLE "public"."admin_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_alerts" TO "service_role";



GRANT ALL ON SEQUENCE "public"."admin_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."admin_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."admin_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."admin_sessions" TO "anon";
GRANT ALL ON TABLE "public"."admin_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."disputes" TO "anon";
GRANT ALL ON TABLE "public"."disputes" TO "authenticated";
GRANT ALL ON TABLE "public"."disputes" TO "service_role";



GRANT ALL ON TABLE "public"."kyc_verification" TO "anon";
GRANT ALL ON TABLE "public"."kyc_verification" TO "authenticated";
GRANT ALL ON TABLE "public"."kyc_verification" TO "service_role";



GRANT ALL ON TABLE "public"."membership_queue" TO "anon";
GRANT ALL ON TABLE "public"."membership_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."membership_queue" TO "service_role";



GRANT ALL ON TABLE "public"."organization" TO "anon";
GRANT ALL ON TABLE "public"."organization" TO "authenticated";
GRANT ALL ON TABLE "public"."organization" TO "service_role";



GRANT ALL ON TABLE "public"."organization_invitation" TO "anon";
GRANT ALL ON TABLE "public"."organization_invitation" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_invitation" TO "service_role";



GRANT ALL ON TABLE "public"."organization_member" TO "anon";
GRANT ALL ON TABLE "public"."organization_member" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_member" TO "service_role";



GRANT ALL ON TABLE "public"."passkey" TO "anon";
GRANT ALL ON TABLE "public"."passkey" TO "authenticated";
GRANT ALL ON TABLE "public"."passkey" TO "service_role";



GRANT ALL ON TABLE "public"."payload_locked_documents" TO "anon";
GRANT ALL ON TABLE "public"."payload_locked_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."payload_locked_documents" TO "service_role";



GRANT ALL ON SEQUENCE "public"."payload_locked_documents_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."payload_locked_documents_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."payload_locked_documents_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."payload_locked_documents_rels" TO "anon";
GRANT ALL ON TABLE "public"."payload_locked_documents_rels" TO "authenticated";
GRANT ALL ON TABLE "public"."payload_locked_documents_rels" TO "service_role";



GRANT ALL ON SEQUENCE "public"."payload_locked_documents_rels_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."payload_locked_documents_rels_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."payload_locked_documents_rels_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."payload_migrations" TO "anon";
GRANT ALL ON TABLE "public"."payload_migrations" TO "authenticated";
GRANT ALL ON TABLE "public"."payload_migrations" TO "service_role";



GRANT ALL ON SEQUENCE "public"."payload_migrations_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."payload_migrations_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."payload_migrations_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."payload_preferences" TO "anon";
GRANT ALL ON TABLE "public"."payload_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."payload_preferences" TO "service_role";



GRANT ALL ON SEQUENCE "public"."payload_preferences_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."payload_preferences_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."payload_preferences_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."payload_preferences_rels" TO "anon";
GRANT ALL ON TABLE "public"."payload_preferences_rels" TO "authenticated";
GRANT ALL ON TABLE "public"."payload_preferences_rels" TO "service_role";



GRANT ALL ON SEQUENCE "public"."payload_preferences_rels_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."payload_preferences_rels_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."payload_preferences_rels_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."session" TO "anon";
GRANT ALL ON TABLE "public"."session" TO "authenticated";
GRANT ALL ON TABLE "public"."session" TO "service_role";



GRANT ALL ON TABLE "public"."system_audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."system_audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."system_audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."tax_forms" TO "anon";
GRANT ALL ON TABLE "public"."tax_forms" TO "authenticated";
GRANT ALL ON TABLE "public"."tax_forms" TO "service_role";



GRANT ALL ON TABLE "public"."transaction_monitoring" TO "anon";
GRANT ALL ON TABLE "public"."transaction_monitoring" TO "authenticated";
GRANT ALL ON TABLE "public"."transaction_monitoring" TO "service_role";



GRANT ALL ON TABLE "public"."two_factor" TO "anon";
GRANT ALL ON TABLE "public"."two_factor" TO "authenticated";
GRANT ALL ON TABLE "public"."two_factor" TO "service_role";



GRANT ALL ON TABLE "public"."user_addresses" TO "anon";
GRANT ALL ON TABLE "public"."user_addresses" TO "authenticated";
GRANT ALL ON TABLE "public"."user_addresses" TO "service_role";



GRANT ALL ON TABLE "public"."user_agreements" TO "anon";
GRANT ALL ON TABLE "public"."user_agreements" TO "authenticated";
GRANT ALL ON TABLE "public"."user_agreements" TO "service_role";



GRANT ALL ON TABLE "public"."user_appearance_settings" TO "anon";
GRANT ALL ON TABLE "public"."user_appearance_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."user_appearance_settings" TO "service_role";



GRANT ALL ON TABLE "public"."user_audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."user_audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."user_audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."user_billing_schedules" TO "anon";
GRANT ALL ON TABLE "public"."user_billing_schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."user_billing_schedules" TO "service_role";



GRANT ALL ON TABLE "public"."user_contacts" TO "anon";
GRANT ALL ON TABLE "public"."user_contacts" TO "authenticated";
GRANT ALL ON TABLE "public"."user_contacts" TO "service_role";



GRANT ALL ON TABLE "public"."user_notification_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_notification_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_notification_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."user_payment_methods" TO "anon";
GRANT ALL ON TABLE "public"."user_payment_methods" TO "authenticated";
GRANT ALL ON TABLE "public"."user_payment_methods" TO "service_role";



GRANT ALL ON TABLE "public"."user_payment_settings" TO "anon";
GRANT ALL ON TABLE "public"."user_payment_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."user_payment_settings" TO "service_role";



GRANT ALL ON TABLE "public"."user_privacy_settings" TO "anon";
GRANT ALL ON TABLE "public"."user_privacy_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."user_privacy_settings" TO "service_role";



GRANT ALL ON TABLE "public"."user_security_settings" TO "anon";
GRANT ALL ON TABLE "public"."user_security_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."user_security_settings" TO "service_role";



GRANT ALL ON TABLE "public"."user_settings" TO "anon";
GRANT ALL ON TABLE "public"."user_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."user_settings" TO "service_role";



GRANT ALL ON TABLE "public"."verification" TO "anon";
GRANT ALL ON TABLE "public"."verification" TO "authenticated";
GRANT ALL ON TABLE "public"."verification" TO "service_role";



GRANT ALL ON TABLE "public"."verification_codes" TO "anon";
GRANT ALL ON TABLE "public"."verification_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."verification_codes" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































RESET ALL;

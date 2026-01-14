CREATE TABLE "newsletter_subscribers" (
    "id" serial PRIMARY KEY NOT NULL,
    "email" varchar(320) NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "confirmation_token" varchar(255),
    "confirmed_at" timestamp,
    "subscribed_at" timestamp DEFAULT now() NOT NULL,
    "unsubscribed_at" timestamp,
    "ip_address" varchar(128),
    "user_agent" text,
    "country" varchar(120),
    "region" varchar(120),
    "city" varchar(120),
    "postal_code" varchar(30),
    "timezone" varchar(120),
    "source" varchar(120),
    "last_activity_at" timestamp,
    "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT "newsletter_subscribers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "newsletter_campaigns" (
    "id" serial PRIMARY KEY NOT NULL,
    "subject" text NOT NULL,
    "preview_text" text,
    "html_content" text NOT NULL,
    "text_content" text,
    "hero_image_url" text,
    "status" varchar(32) DEFAULT 'draft' NOT NULL,
    "created_by" integer REFERENCES "users"("id"),
    "created_at" timestamp DEFAULT now(),
    "scheduled_for" timestamp,
    "sent_at" timestamp,
    "metrics" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "newsletter_deliveries" (
    "id" serial PRIMARY KEY NOT NULL,
    "campaign_id" integer NOT NULL REFERENCES "newsletter_campaigns"("id") ON DELETE cascade,
    "subscriber_id" integer NOT NULL REFERENCES "newsletter_subscribers"("id") ON DELETE cascade,
    "email" varchar(320) NOT NULL,
    "status" varchar(32) NOT NULL,
    "error" text,
    "sent_at" timestamp DEFAULT now(),
    "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE INDEX "newsletter_deliveries_campaign_idx" ON "newsletter_deliveries" ("campaign_id");
--> statement-breakpoint
CREATE INDEX "newsletter_deliveries_subscriber_idx" ON "newsletter_deliveries" ("subscriber_id");

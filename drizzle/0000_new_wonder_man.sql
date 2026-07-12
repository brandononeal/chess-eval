CREATE TABLE "analyzed_games" (
	"user_id" integer NOT NULL,
	"url" text NOT NULL,
	"analyzed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "analyzed_games_user_id_url_pk" PRIMARY KEY("user_id","url")
);
--> statement-breakpoint
CREATE TABLE "drill_history" (
	"user_id" integer NOT NULL,
	"drill_id" text NOT NULL,
	"drill" jsonb NOT NULL,
	"passed" boolean NOT NULL,
	"fails" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "drill_history_user_id_drill_id_pk" PRIMARY KEY("user_id","drill_id")
);
--> statement-breakpoint
CREATE TABLE "game_analyses" (
	"url" text NOT NULL,
	"depth" integer NOT NULL,
	"cache_version" integer NOT NULL,
	"analysis" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "game_analyses_url_depth_cache_version_pk" PRIMARY KEY("url","depth","cache_version")
);
--> statement-breakpoint
CREATE TABLE "report_progress" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"phase" text NOT NULL,
	"current" integer DEFAULT 0 NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"focus" text NOT NULL,
	"minutes" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"chesscom_username" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_chesscom_username_unique" UNIQUE("chesscom_username")
);
--> statement-breakpoint
ALTER TABLE "analyzed_games" ADD CONSTRAINT "analyzed_games_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drill_history" ADD CONSTRAINT "drill_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_progress" ADD CONSTRAINT "report_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_log" ADD CONSTRAINT "study_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
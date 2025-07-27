CREATE TABLE IF NOT EXISTS "ai-app-template_chat_stream" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"chat_id" varchar(255) NOT NULL,
	"stream_id" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai-app-template_message" ADD COLUMN "annotations" json;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai-app-template_chat_stream" ADD CONSTRAINT "ai-app-template_chat_stream_chat_id_ai-app-template_chat_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."ai-app-template_chat"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_stream_chat_id_idx" ON "ai-app-template_chat_stream" USING btree ("chat_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_stream_stream_id_idx" ON "ai-app-template_chat_stream" USING btree ("stream_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_stream_created_at_idx" ON "ai-app-template_chat_stream" USING btree ("created_at");
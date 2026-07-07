CREATE INDEX IF NOT EXISTS "blogs_status_idx" ON "blogs" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "blogs_date_created_idx" ON "blogs" USING btree ("date_created");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "catalog_status_idx" ON "catalog" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "catalog_product_idx" ON "catalog" USING btree ("product");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "catalog_sub_product_idx" ON "catalog" USING btree ("sub_product");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "catalog_brand_idx" ON "catalog" USING btree ("brand");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "catalog_date_created_idx" ON "catalog" USING btree ("date_created");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "client_contact_is_read_idx" ON "client_contact" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "event_types_slug_idx" ON "event_types" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_medical_events_idx" ON "events" USING btree ("medical_events");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "partners_partnership_types_idx" ON "partners" USING btree ("partnership_types");
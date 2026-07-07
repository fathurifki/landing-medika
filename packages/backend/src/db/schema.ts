import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  uuid,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

// ─── Auth ────────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("admin"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Files ───────────────────────────────────────────────────────────────────

export const files = pgTable("files", {
  id: uuid("id").primaryKey().defaultRandom(),
  filename: varchar("filename", { length: 255 }).notNull(),
  originalName: varchar("original_name", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  size: integer("size").notNull(),
  path: varchar("path", { length: 500 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Blog ────────────────────────────────────────────────────────────────────

export const blogs = pgTable("blogs", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content"),
  banner: uuid("banner").references(() => files.id),
  status: varchar("status", { length: 50 }).notNull().default("draft"),
  slugs: varchar("slugs", { length: 500 }),
  tags: jsonb("tags").$type<string[]>().default([]),
  dateCreated: timestamp("date_created").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  statusIdx: index("blogs_status_idx").on(table.status),
  dateCreatedIdx: index("blogs_date_created_idx").on(table.dateCreated),
}));

// ─── Partners ────────────────────────────────────────────────────────────────

export const partners = pgTable("partners", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  logos: uuid("logos").references(() => files.id),
  partnershipTypes: integer("partnership_types").notNull().default(1), // 1=international, 2=local
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  partnershipTypesIdx: index("partners_partnership_types_idx").on(table.partnershipTypes),
}));

// ─── Medical Specialty ───────────────────────────────────────────────────────

export const medicalSpecialties = pgTable("medical_specialty", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  image: uuid("image").references(() => files.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Category Product ────────────────────────────────────────────────────────

export const categoryProduct = pgTable("category_product", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Sub Category ────────────────────────────────────────────────────────────

export const subCategory = pgTable("sub_category", {
  id: serial("id").primaryKey(),
  subCategory: varchar("sub_category", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Brand ───────────────────────────────────────────────────────────────────

export const brand = pgTable("brand", {
  id: serial("id").primaryKey(),
  brandName: varchar("brand_name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Catalog ─────────────────────────────────────────────────────────────────

export const catalog = pgTable("catalog", {
  uuid: uuid("uuid").primaryKey().defaultRandom(),
  name: varchar("name", { length: 500 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 50 }).notNull().default("draft"),
  productImage: uuid("product_image").references(() => files.id),
  additionalImage: uuid("additional_image").references(() => files.id),
  productVideo: uuid("product_video").references(() => files.id),
  product: integer("product").references(() => categoryProduct.id),       // category FK
  subProduct: integer("sub_product").references(() => subCategory.id),    // sub-category FK
  brandId: integer("brand").references(() => brand.id),
  tags: jsonb("tags").$type<string[]>().default([]),
  imageFiles: jsonb("image_files").$type<string[]>().default([]),
  sortOrder: integer("sort_order"),
  userCreated: integer("user_created").references(() => users.id),
  dateCreated: timestamp("date_created").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  statusIdx: index("catalog_status_idx").on(table.status),
  productIdx: index("catalog_product_idx").on(table.product),
  subProductIdx: index("catalog_sub_product_idx").on(table.subProduct),
  brandIdx: index("catalog_brand_idx").on(table.brandId),
  dateCreatedIdx: index("catalog_date_created_idx").on(table.dateCreated),
}));

// ─── Event Types ─────────────────────────────────────────────────────────────

export const eventTypes = pgTable("event_types", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 255 }),
  eventName: varchar("event_name", { length: 255 }).notNull(),
  nameEvents: varchar("name_events", { length: 255 }),
  description: text("description"),
  eventImage: uuid("event_image").references(() => files.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  slugIdx: index("event_types_slug_idx").on(table.slug),
}));

// ─── Events ──────────────────────────────────────────────────────────────────

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  eventImage: uuid("event_image").references(() => files.id),
  medicalEvents: integer("medical_events").references(() => eventTypes.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  medicalEventsIdx: index("events_medical_events_idx").on(table.medicalEvents),
}));

// ─── Company ─────────────────────────────────────────────────────────────────

export const company = pgTable("company", {
  id: serial("id").primaryKey(),
  logoFooter: uuid("logo_footer").references(() => files.id),
  logoNavbar: uuid("logo_navbar").references(() => files.id),
  instagram: varchar("instagram", { length: 255 }),
  linkedin: varchar("linkedin", { length: 255 }),
  youtube: varchar("youtube", { length: 255 }),
  address: text("address"),
  emailAddress: varchar("email_address", { length: 255 }),
  phoneNumber: varchar("phone_number", { length: 100 }),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Client Contact ──────────────────────────────────────────────────────────

export const clientContact = pgTable("client_contact", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phoneNumber: varchar("phone_number", { length: 50 }),
  message: text("message"),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  isReadIdx: index("client_contact_is_read_idx").on(table.isRead),
}));

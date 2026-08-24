import { z } from "zod";

const email = z.string().trim().toLowerCase().email("Enter a valid email address");
const phone = z
  .string()
  .trim()
  .regex(/^(\+91[\s-]?)?[6-9]\d{9}$/, "Enter a valid 10-digit mobile number");
const password = z.string().min(6, "Password must be at least 6 characters").max(128);
const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

/* ─────────────────────────────── auth ─────────────────────────────────── */

export const signupRequestSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  email,
  phone,
});

export const signupVerifySchema = z.object({
  email,
  code: z.string().trim().regex(/^\d{4,8}$/, "Enter the code we emailed you"),
  password: password.optional(),
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(3, "Enter your email or mobile number"),
  password,
});

export const otpRequestSchema = z.object({ email });

export const otpVerifySchema = z.object({
  email,
  code: z.string().trim().regex(/^\d{4,8}$/, "Enter the code we emailed you"),
});

export const resetPasswordSchema = z.object({
  email,
  code: z.string().trim().regex(/^\d{4,8}$/),
  password,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().optional().default(""),
  newPassword: password,
});

export const adminLoginSchema = z.object({ email, password });

/* ────────────────────────────── addresses ─────────────────────────────── */

export const addressSchema = z.object({
  label: z.enum(["Home", "Work", "Other"]).default("Home"),
  fullName: z.string().trim().min(2, "Enter the recipient's name"),
  phone,
  line1: z.string().trim().min(3, "Enter the flat, house or building"),
  line2: z.string().trim().optional().default(""),
  landmark: z.string().trim().optional().default(""),
  city: z.string().trim().min(2, "Enter the city"),
  state: z.string().trim().min(2, "Enter the state"),
  pincode: z.string().trim().regex(/^\d{6}$/, "PIN code must be 6 digits"),
  isDefault: z.boolean().optional().default(false),
});

/* ──────────────────────────────── cart ────────────────────────────────── */

export const cartAddSchema = z.object({
  productId: objectId,
  size: z.string().trim().optional().default(""),
  color: z.string().trim().optional().default(""),
  qty: z.coerce.number().int().min(1).max(10).optional().default(1),
});

export const cartUpdateSchema = cartAddSchema.extend({
  qty: z.coerce.number().int().min(0).max(10),
});

export const couponApplySchema = z.object({
  code: z.string().trim().min(2).max(32),
});

/* ─────────────────────────────── orders ───────────────────────────────── */

export const placeOrderSchema = z.object({
  addressId: objectId.optional(),
  address: addressSchema.partial().optional(),
  paymentMethod: z.enum(["upi", "card", "cod"]),
  deliverySpeed: z.enum(["standard", "express"]).optional().default("standard"),
});

export const orderStatusSchema = z.object({
  status: z.enum([
    "placed", "confirmed", "packed", "shipped",
    "out-for-delivery", "delivered", "cancelled", "returned",
  ]),
  note: z.string().trim().optional().default(""),
});

/* ────────────────────────────── catalogue ─────────────────────────────── */

export const productQuerySchema = z.object({
  category: z.string().trim().optional(),
  age: z.string().trim().optional(),
  brand: z.union([z.string(), z.array(z.string())]).optional(),
  badge: z.enum(["new", "bestseller", "sale", "limited"]).optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  q: z.string().trim().optional(),
  sort: z.enum(["popular", "new", "price-asc", "price-desc", "rating"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const seoSchema = z
  .object({
    title: z.string().trim().max(200).optional(),
    description: z.string().trim().max(500).optional(),
    keywords: z.array(z.string()).optional(),
    ogImage: z.string().optional(),
    canonical: z.string().optional(),
    index: z.boolean().optional(),
    follow: z.boolean().optional(),
  })
  .optional();

/* Kept as a plain object so `.partial()` still works for PATCH. `.refine()`
   returns a ZodEffects, which has no `.partial()` — hence the split below. */
const productBaseSchema = z.object({
  title: z.string().trim().min(2, "Title is required"),
  slug: z.string().trim().optional(),
  brand: z.string().trim().min(1, "Pick a brand"),
  categorySlug: z.string().trim().min(1, "Pick a category"),
  ageSlugs: z.array(z.string()).optional().default([]),
  images: z
    .array(z.object({ url: z.string(), publicId: z.string().optional(), alt: z.string().optional() }))
    .min(1, "Add at least one image"),
  price: z.coerce.number().min(0),
  mrp: z.coerce.number().min(0),
  badge: z.enum(["new", "bestseller", "sale", "limited", ""]).optional().default(""),
  colors: z.array(z.object({ name: z.string(), hex: z.string() })).optional().default([]),
  sizes: z.array(z.string()).optional().default([]),
  description: z.string().trim().optional().default(""),
  highlights: z.array(z.string()).optional().default([]),
  safety: z
    .object({
      certification: z.string().optional().default(""),
      ageWarning: z.string().optional().default(""),
      material: z.string().optional().default(""),
    })
    .optional(),
  stock: z.coerce.number().int().min(0).optional().default(0),
  inStock: z.boolean().optional().default(true),
  isReturnable: z.boolean().optional().default(true),
  returnWindowDays: z.coerce.number().int().min(0).max(180).optional().default(30),
  returnPolicyNote: z.string().trim().max(300).optional().default(""),
  isActive: z.boolean().optional().default(true),
  seo: seoSchema,
});

const mrpNotBelowPrice = (v) => v.mrp == null || v.price == null || v.mrp >= v.price;
const mrpMessage = {
  message: "MRP cannot be lower than the selling price",
  path: ["mrp"],
};

export const productWriteSchema = productBaseSchema.refine(mrpNotBelowPrice, mrpMessage);

/** PATCH variant: every field optional, but the price rule still holds. */
export const productPatchSchema = productBaseSchema
  .partial()
  .refine(mrpNotBelowPrice, mrpMessage);

export const categoryWriteSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  slug: z.string().trim().optional(),
  parent: z.string().trim().nullable().optional(),
  blurb: z.string().trim().optional().default(""),
  image: z.object({ url: z.string(), publicId: z.string().optional() }).optional(),
  glyph: z.string().optional(),
  accent: z.enum(["brand", "mint", "sun", "grape", "sky"]).optional(),
  order: z.coerce.number().optional(),
  isActive: z.boolean().optional(),
  seo: seoSchema,
});

export const brandWriteSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  slug: z.string().trim().optional(),
  description: z.string().trim().optional().default(""),
  logo: z.object({ url: z.string(), publicId: z.string().optional() }).optional(),
  isActive: z.boolean().optional(),
  order: z.coerce.number().optional(),
});

/* ───────────────────────────── merchandising ──────────────────────────── */

export const bannerWriteSchema = z.object({
  title: z.string().trim().min(2, "Headline is required"),
  subtitle: z.string().trim().optional().default(""),
  cta: z.string().trim().optional().default("Shop now"),
  href: z.string().trim().optional().default("/deals"),
  image: z.object({ url: z.string(), publicId: z.string().optional() }).optional(),
  gradient: z.string().optional(),
  align: z.enum(["left", "right"]).optional(),
  placement: z.enum(["hero", "strip", "category"]).optional(),
  order: z.coerce.number().optional(),
  isActive: z.boolean().optional(),
  startsAt: z.coerce.date().nullable().optional(),
  endsAt: z.coerce.date().nullable().optional(),
});

export const dealWriteSchema = z.object({
  title: z.string().trim().min(2, "Title is required"),
  discountLabel: z.string().trim().min(1, "Offer label is required"),
  href: z.string().trim().optional(),
  image: z.object({ url: z.string(), publicId: z.string().optional() }).optional(),
  accent: z.string().optional(),
  endsAt: z.coerce.date(),
  order: z.coerce.number().optional(),
  isActive: z.boolean().optional(),
});

export const couponWriteSchema = z.object({
  code: z.string().trim().min(3).max(32),
  title: z.string().trim().min(2),
  description: z.string().trim().optional().default(""),
  type: z.enum(["percent", "flat", "shipping"]),
  value: z.coerce.number().min(0).optional().default(0),
  maxDiscount: z.coerce.number().min(0).optional().default(0),
  minOrder: z.coerce.number().min(0).optional().default(0),
  category: z.string().trim().optional().default(""),
  startsAt: z.coerce.date().nullable().optional(),
  expiresAt: z.coerce.date(),
  usageLimit: z.coerce.number().min(0).optional().default(0),
  perUserLimit: z.coerce.number().min(0).optional().default(1),
  featured: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const profileSchema = z.object({
  name: z.string().trim().min(2).optional(),
  phone: phone.optional(),
  dob: z.coerce.date().nullable().optional(),
  gender: z.enum(["male", "female", "other", ""]).optional(),
  avatar: z.string().optional(),
  preferences: z
    .object({
      offers: z.boolean().optional(),
      restock: z.boolean().optional(),
      newsletter: z.boolean().optional(),
      channels: z
        .object({
          email: z.boolean().optional(),
          sms: z.boolean().optional(),
          whatsapp: z.boolean().optional(),
        })
        .optional(),
    })
    .optional(),
});

/* ─────────────────────────────── reviews ──────────────────────────────── */

export const reviewWriteSchema = z.object({
  productId: objectId,
  orderId: objectId,
  rating: z.coerce.number().int().min(1, "Pick a rating").max(5),
  title: z.string().trim().max(120).optional().default(""),
  comment: z.string().trim().max(2000).optional().default(""),
});

export const reviewModerateSchema = z.object({
  approve: z.boolean(),
  note: z.string().trim().max(500).optional().default(""),
});

/* ─────────────────────────────── returns ──────────────────────────────── */

export const returnCompleteSchema = z.object({
  restock: z.boolean().optional().default(true),
  /** Omitted means "refund the full value of the returned lines". */
  amount: z.coerce.number().positive("Refund must be more than zero").optional(),
  deductionNote: z.string().trim().max(300).optional(),
});

export const markRefundPaidSchema = z.object({
  reference: z.string().trim().max(80).optional(),
});

export const returnRequestSchema = z.object({
  itemIndexes: z.array(z.coerce.number().int().min(0)).min(1, "Pick at least one item"),
  reasonCode: z.enum([
    "wrong-size", "damaged", "wrong-item",
    "not-as-described", "quality-issue", "changed-mind", "other",
  ]),
  reasonText: z.string().trim().max(500).optional().default(""),
  resolution: z.enum(["refund", "exchange"]).optional().default("refund"),

  /** "source" reverses the original payment; the others need an account. */
  refundMode: z.enum(["source", "bank", "upi"]).optional(),
  bankDetails: z
    .object({
      accountName: z.string().trim().min(2, "Enter the account holder's name").max(100).optional(),
      accountNumber: z
        .string()
        .trim()
        .regex(/^\d{9,18}$/, "Account number must be 9–18 digits")
        .optional(),
      ifsc: z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Enter a valid IFSC code")
        .optional(),
      bankName: z.string().trim().max(100).optional(),
      upiId: z
        .string()
        .trim()
        .regex(/^[\w.\-]{2,}@[a-zA-Z]{2,}$/, "Enter a valid UPI ID")
        .optional(),
    })
    .optional(),
});

export const returnResolveSchema = z.object({
  approve: z.boolean(),
  note: z.string().trim().max(500).optional().default(""),
});

export const idParamSchema = z.object({ id: objectId });

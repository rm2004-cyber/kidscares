import { Router } from "express";
import * as c from "../controllers/catalog.controller.js";
import * as reviews from "../controllers/review.controller.js";
import { validate } from "../middleware/validate.js";
import * as s from "../validators/schemas.js";

const router = Router();

router.get("/products", validate(s.productQuerySchema, "query"), c.listProducts);
router.get("/products/suggestions", c.suggestions);
router.get("/products/:slug/reviews", reviews.productReviews);
router.get("/products/:slug", c.getProduct);

router.get("/categories", c.listCategories);
/* Nested slugs like clothing/dresses — the wildcard keeps the URL shape the
   storefront already uses instead of forcing an encoded parameter. */
router.get("/categories/*", c.getCategory);

router.get("/brands", c.listBrands);
router.get("/age-groups", c.listAgeGroups);

export default router;

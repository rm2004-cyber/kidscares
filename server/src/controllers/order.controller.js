import { asyncHandler } from "../utils/asyncHandler.js";
import { ok, created, paginated } from "../utils/response.js";
import { readPaging } from "../utils/pagination.js";
import { orderService } from "../services/order.service.js";
import { Order } from "../models/Order.js";
import { ApiError } from "../utils/ApiError.js";
import { invoiceService } from "../services/invoice.service.js";
import { pdfService } from "../services/pdf.service.js";
import { User } from "../models/User.js";
import { Settings } from "../models/Settings.js";

export const placeOrder = asyncHandler(async (req, res) => {
  const { addressId, address, paymentMethod, deliverySpeed } = req.body;

  /* Prefer a saved address by id — the client cannot invent a delivery
     address that is not on the account. A raw address is accepted only as a
     fallback for the "add new at checkout" flow. */
  let snapshot = address;
  if (addressId) {
    const saved = req.user.addresses.id(addressId);
    if (!saved) throw ApiError.notFound("That address is not on your account");
    snapshot = saved.toObject();
    delete snapshot._id;
  }
  if (!snapshot) throw ApiError.badRequest("Choose a delivery address");

  const order = await orderService.placeOrder({
    user: req.user,
    address: snapshot,
    paymentMethod,
    deliverySpeed,
  });

  return created(res, order);
});

export const listMyOrders = asyncHandler(async (req, res) => {
  const paging = readPaging(req.query, { defaultLimit: 10 });
  const { items, total } = await orderService.listUserOrders(req.user.id, paging);
  return paginated(res, items, { ...paging, total });
});

export const getMyOrder = asyncHandler(async (req, res) =>
  ok(res, await orderService.getUserOrder(req.user.id, req.params.id)),
);

export const cancelMyOrder = asyncHandler(async (req, res) =>
  ok(res, await orderService.cancelOrder(req.user.id, req.params.id, req.body?.reason)),
);

/**
 * Printable invoice.
 *
 * Served as HTML with a "Save as PDF" button rather than a generated PDF —
 * the browser's print engine does the conversion, so there is no headless
 * Chromium to run or font stack to ship.
 */
export const invoice = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user.id });
  if (!order) throw ApiError.notFound("Order not found");

  return sendInvoice(res, { order, user: req.user, format: req.query.format });
});

/** Same invoice, reachable by an admin for any order. */
/** Thermal packing-slip data for the admin print view. */
/** Public tracking, keyed by order number rather than internal id. */
export const track = asyncHandler(async (req, res) =>
  ok(
    res,
    await orderService.getTracking({
      orderNo: req.params.orderNo,
      /* Signed in: the order must be theirs. Signed out: order numbers are
         unguessable, and letting a customer track from a confirmation email
         without signing in is worth more than the marginal secrecy. */
      userId: req.user?._id,
    }),
  ),
);

export const receipt = asyncHandler(async (req, res) =>
  ok(res, await orderService.getReceipt(req.params.id)),
);

export const adminInvoice = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound("Order not found");

  const user = await User.findById(order.user);
  return sendInvoice(res, { order, user, format: req.query.format });
});

/**
 * PDF by default; `?format=html` returns the printable page instead.
 *
 * Both come from the same order data, so the emailed attachment and the
 * downloaded copy can never disagree.
 */
async function sendInvoice(res, { order, user, format }) {
  const settings = await Settings.getSite();

  if (format === "html") {
    const html = invoiceService.renderInvoice({ order, user, settings });
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(html);
  }

  const pdf = await pdfService.generateInvoicePdf({ order, user, settings });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="invoice-${order.orderNo}.pdf"`,
  );
  res.setHeader("Content-Length", pdf.length);
  return res.end(pdf);
}

/* ─────────────────────────────── admin ────────────────────────────────── */

export const listOrders = asyncHandler(async (req, res) => {
  const paging = readPaging(req.query, { defaultLimit: 20 });
  const { items, total } = await orderService.listAllOrders(req.query, paging);
  return paginated(res, items, { ...paging, total });
});

export const updateStatus = asyncHandler(async (req, res) =>
  ok(
    res,
    await orderService.updateOrderStatus(
      req.params.id,
      req.body.status,
      req.body.note,
      req.admin,
    ),
  ),
);

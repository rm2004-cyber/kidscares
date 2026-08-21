import { AnalyticsEvent, TrafficSample } from "../models/Analytics.js";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { User } from "../models/User.js";

/**
 * In-memory presence registry.
 *
 * Live traffic is read from here, not from Mongo: a dashboard that refreshes
 * every second must not cost a query every second. Mongo only receives a
 * rolled-up sample once a minute, which is what survives a restart.
 */
const visitors = new Map(); // socketId -> visitor

export const presence = {
  join(socketId, data) {
    visitors.set(socketId, { id: socketId, ...data, enteredAt: Date.now() });
  },
  move(socketId, patch) {
    const v = visitors.get(socketId);
    if (v) visitors.set(socketId, { ...v, ...patch });
  },
  leave(socketId) {
    visitors.delete(socketId);
  },
  list() {
    return [...visitors.values()];
  },
  count() {
    return visitors.size;
  },
  /** Shape the admin Live Traffic screen consumes. */
  snapshot() {
    const list = [...visitors.values()];

    const byPath = new Map();
    const byCity = new Map();
    const byReferrer = new Map();
    const byDevice = { mobile: 0, desktop: 0, tablet: 0 };

    for (const v of list) {
      const page = byPath.get(v.path) ?? { path: v.path, title: v.title, count: 0 };
      page.count += 1;
      byPath.set(v.path, page);

      byCity.set(v.city, (byCity.get(v.city) ?? 0) + 1);
      byReferrer.set(v.referrer, (byReferrer.get(v.referrer) ?? 0) + 1);
      if (byDevice[v.device] !== undefined) byDevice[v.device] += 1;
    }

    return {
      online: list.length,
      visitors: list,
      byPath: [...byPath.values()].sort((a, b) => b.count - a.count),
      byCity: [...byCity.entries()]
        .map(([city, count]) => ({ city, count }))
        .sort((a, b) => b.count - a.count),
      byReferrer: [...byReferrer.entries()]
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count),
      byDevice,
      at: Date.now(),
    };
  },
};

export async function recordEvent(event) {
  // Fire-and-forget: analytics must never slow down or fail a page view.
  try {
    await AnalyticsEvent.create(event);
  } catch {
    /* swallowed on purpose */
  }
}

export async function persistSample() {
  const snap = presence.snapshot();
  if (snap.online === 0) return null;

  const byPath = {};
  for (const p of snap.byPath) byPath[p.path] = p.count;

  return TrafficSample.create({
    online: snap.online,
    byPath,
    byDevice: snap.byDevice,
  });
}

export async function trafficHistory(minutes = 120) {
  const since = new Date(Date.now() - minutes * 60_000);
  return TrafficSample.find({ at: { $gte: since } }).sort({ at: 1 }).lean();
}

export async function recentEvents(limit = 60) {
  return AnalyticsEvent.find().sort({ at: -1 }).limit(limit).lean();
}

/** Numbers behind the admin dashboard cards and charts. */
export async function dashboardStats() {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
  const prevWeek = new Date(now.getTime() - 14 * 86_400_000);

  const paid = { status: { $nin: ["cancelled"] } };

  const [thisWeek, lastWeek, orderCount, customerCount, productCount, lowStock] =
    await Promise.all([
      Order.aggregate([
        { $match: { ...paid, createdAt: { $gte: weekAgo } } },
        { $group: { _id: null, revenue: { $sum: "$total" }, count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { ...paid, createdAt: { $gte: prevWeek, $lt: weekAgo } } },
        { $group: { _id: null, revenue: { $sum: "$total" }, count: { $sum: 1 } } },
      ]),
      Order.countDocuments(paid),
      User.countDocuments({ status: "active" }),
      Product.countDocuments({ isActive: true }),
      Product.find({ isActive: true, inStock: false }).limit(6).lean(),
    ]);

  const cur = thisWeek[0] ?? { revenue: 0, count: 0 };
  const prev = lastWeek[0] ?? { revenue: 0, count: 0 };
  const delta = (a, b) => (b === 0 ? (a > 0 ? 100 : 0) : Math.round(((a - b) / b) * 1000) / 10);

  const revenueSeries = await Order.aggregate([
    { $match: { ...paid, createdAt: { $gte: weekAgo } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        value: { $sum: "$total" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const topCategories = await Order.aggregate([
    { $match: { ...paid, createdAt: { $gte: weekAgo } } },
    { $unwind: "$items" },
    { $group: { _id: "$items.brand", value: { $sum: "$items.qty" } } },
    { $sort: { value: -1 } },
    { $limit: 5 },
  ]);

  return {
    revenue: { value: cur.revenue, delta: delta(cur.revenue, prev.revenue) },
    orders: { value: cur.count, delta: delta(cur.count, prev.count) },
    customers: { value: customerCount },
    products: { value: productCount },
    totalOrders: orderCount,
    online: presence.count(),
    revenueSeries: revenueSeries.map((r) => ({ label: r._id.slice(5), value: r.value })),
    topCategories: topCategories.map((c) => ({ label: c._id ?? "Other", value: c.value })),
    lowStock,
  };
}

export const analyticsService = {
  presence,
  recordEvent,
  persistSample,
  trafficHistory,
  recentEvents,
  dashboardStats,
};

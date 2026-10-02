// MHI BizMate — Analytics service.
// Delegates to ordersApi for order-based analytics.
import { ordersApi } from "./orders";

export const analyticsApi = {
  orders: (sort, limit) => ordersApi.list(sort, limit),
};
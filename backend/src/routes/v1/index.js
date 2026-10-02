// MHI BizMate — API v1 router.
// Mounts all v1 resource routers. All routes require auth (authMiddleware).
import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.js";
import { customersRouter } from "./customers.js";
import { productsRouter } from "./products.js";
import { ordersRouter } from "./orders.js";
import { leadsRouter } from "./leads.js";
import { transactionsRouter } from "./transactions.js";
import { notificationsRouter } from "./notifications.js";
import { businessRouter } from "./business.js";
import { dashboardRouter } from "./dashboard.js";
import { conversationsRouter } from "./conversations.js";
import { sourcingRouter } from "./sourcing.js";
import { marketingRouter } from "./marketing.js";
import { automationRouter } from "./automation.js";
import { heartRouter } from "./heart.js";

export const v1Router = Router();

// All v1 routes require authentication
v1Router.use(authMiddleware);

v1Router.use("/customers", customersRouter);
v1Router.use("/products", productsRouter);
v1Router.use("/orders", ordersRouter);
v1Router.use("/leads", leadsRouter);
v1Router.use("/transactions", transactionsRouter);
v1Router.use("/notifications", notificationsRouter);
v1Router.use("/business", businessRouter);
v1Router.use("/dashboard", dashboardRouter);
v1Router.use("/conversations", conversationsRouter);
v1Router.use("/sourcing", sourcingRouter);
v1Router.use("/marketing", marketingRouter);
v1Router.use("/automation", automationRouter);
v1Router.use("/heart", heartRouter);
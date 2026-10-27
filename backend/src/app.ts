/**
 * ============================================================
 * Application Entry Point
 * ============================================================
 */

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import propertyRoutes from "./features/property/routes/propertyRoutes";
import customerRoutes from "./features/customer/routes/customerRoutes";


import {
  startPropertyExpirationScheduler,
} from "./jobs/propertyExpirationScheduler";

import evaluationRoutes from "./features/evaluation/routes/evaluationRoutes";

import ownerRoutes from "./features/owner/routes/ownerRoutes";

import agentRoutes from "./features/agent/routes/agentRoutes";

import notificationRoutes from "./features/notification/routes/notificationRoutes";

import customerPropertyFavoriteRoutes from "./features/favorite/routes/customerPropertyFavoriteRoutes";

import authRoutes from "./features/auth/routes/authRoutes";

import hashtiRoutes from "./features/hashti/routes/hashtiRoutes";
import adminRoutes from "./features/admin/routes/adminRoutes";

const app = express();

/**
 * ============================================================
 * Middleware
 * ============================================================
 */

/**
 * تنظیمات CORS برای ارتباط با کلاینت Next.js
 */
const allowedOrigins = (
  process.env.CORS_ORIGINS ||
  "http://localhost:3000,http://localhost:3002"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // درخواست‌های بدون Origin مانند ابزارهای خط فرمان نیز مجازند.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());


/**
 * ============================================================
 * Routes
 * ============================================================
 */

app.use(propertyRoutes);
app.use(customerRoutes);
app.use(evaluationRoutes);
app.use(ownerRoutes);
app.use(agentRoutes);
app.use(notificationRoutes);
app.use(customerPropertyFavoriteRoutes);
app.use(authRoutes);
app.use(hashtiRoutes);
app.use(adminRoutes);




/**
 * ============================================================
 * Property Expiration Scheduler
 * ============================================================
 *
 * Scheduler هنگام بالا آمدن Backend فعال می‌شود.
 *
 * Scheduler خودش منطق انقضای ملک را ندارد؛
 * فقط Job مربوطه را در بازه زمانی مشخص اجرا می‌کند.
 */
startPropertyExpirationScheduler();

/**
 * ============================================================
 * Server
 * ============================================================
 */

const PORT = process.env.PORT || 4000;

app.listen(
  Number(PORT),
  "0.0.0.0",
  () => {
    console.log(
      `Server is running on http://0.0.0.0:${PORT}`
    );
  }
);

export default app;
/**
 * Authorization Registry
 *
 * فقط مشخص می‌کند هر منبع از کدام Policy استفاده می‌کند.
 * Policyها هنگام آماده شدن هر Feature به‌صورت تدریجی ثبت می‌شوند.
 */

import type {
  AuthorizationPolicy,
  AuthorizationResource,
} from "./authorization.types";

const policies = new Map<AuthorizationResource, AuthorizationPolicy>();

export function registerAuthorizationPolicy(
  resource: AuthorizationResource,
  policy: AuthorizationPolicy,
): void {
  if (policies.has(resource)) {
    throw new Error(`Authorization policy already registered for "${resource}".`);
  }

  policies.set(resource, policy);
}

export function getAuthorizationPolicy(
  resource: AuthorizationResource,
): AuthorizationPolicy | undefined {
  return policies.get(resource);
}

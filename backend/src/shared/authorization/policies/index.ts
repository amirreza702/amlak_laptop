import { registerAuthorizationPolicy } from "../authorization.registry";
import { propertyPolicy } from "./property.policy";
import { selfOwnedResourcePolicy } from "./self-owned-resource.policy";

// ثبت Policyها در یک نقطه مشخص و هنگام بارگذاری Authorization Core.
registerAuthorizationPolicy("property", propertyPolicy);
registerAuthorizationPolicy("owner", selfOwnedResourcePolicy);
registerAuthorizationPolicy("agent", selfOwnedResourcePolicy);
registerAuthorizationPolicy("customer", selfOwnedResourcePolicy);
registerAuthorizationPolicy("notification", selfOwnedResourcePolicy);
registerAuthorizationPolicy("searchRequest", selfOwnedResourcePolicy);

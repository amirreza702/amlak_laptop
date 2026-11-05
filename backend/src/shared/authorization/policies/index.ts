import { registerAuthorizationPolicy } from "../authorization.registry";
import { propertyPolicy } from "./property.policy";

// ثبت Policyها در یک نقطه مشخص و هنگام بارگذاری Authorization Core.
registerAuthorizationPolicy("property", propertyPolicy);

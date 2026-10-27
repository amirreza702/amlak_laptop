/**
 * ============================================================
 * PropertyAgent
 * ============================================================
 *
 * ارتباط بین Property و Agent
 *
 * یک Property می‌تواند چند Agent داشته باشد
 * و یک Agent نیز می‌تواند چند Property داشته باشد.
 *
 * این Interface قرارداد داده‌ای PropertyAgent در
 * لایه‌های مختلف Feature Property است.
 */

import type {
  PropertyAgentStatus,
} from "@prisma/client";

export interface PropertyAgent {

  /**
   * شناسه ملک
   */
  propertyId: string;

  /**
   * شناسه مشاور
   */
  agentId: string;

  /**
   * وضعیت ارتباط مشاور با ملک
   */
  status: PropertyAgentStatus;

  /**
   * آیا مالک، این مشاور را تأیید کرده است؟
   */
  approvedByOwner: boolean;

  /**
   * زمان تأیید مشاور توسط مالک
   *
   * اگر هنوز تأیید نشده باشد، null است.
   */
  approvedAt: Date | null;

  /**
   * زمان ثبت ارتباط مشاور با ملک
   */
  registeredAt: Date;

  /**
   * آیا این مشاور اولین ثبت‌کننده این ملک بوده؟
   */
  isFirstRegistrant: boolean;
}
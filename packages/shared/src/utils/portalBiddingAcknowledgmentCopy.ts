import { PORTAL_BIDDING_ACKNOWLEDGMENT_VERSION } from "../constants/portal/portalBiddingAcknowledgment.constants";

export interface PortalBiddingAcknowledgmentCopy {
  title: string;
  paragraphs: string[];
  checkboxLabel: string;
  version: typeof PORTAL_BIDDING_ACKNOWLEDGMENT_VERSION;
}

/** Shared exclusive-order note (owner authoritative). */
export const PORTAL_BIDDING_ACK_EXCLUSIVE_PARAGRAPH =
  "Need a design printed exclusively for you that won't be on the show? Submit a custom gang sheet order at funkyfreshprints.com instead.";

/**
 * Short hint for size-tier / show-total modals (owner authoritative).
 * Explains price × quantity commitment without platform-specific wording.
 */
export const PORTAL_SHOW_PRICE_COMMITMENT_HINT =
  "Show prices are per print by size. You commit to pay each size's price × the quantity you request.";

/** Add to Show / queue-to-show confirmation copy (owner authoritative). */
export function buildPortalBiddingAcknowledgmentCopy(): PortalBiddingAcknowledgmentCopy {
  return {
    title: "Add to Show",
    paragraphs: [
      "Your designs will be printed for the selected live show and held in your personal bin at the tiered show prices.",
      "The estimated show total is your commitment for those prints. You are not charged to submit this request.",
      PORTAL_BIDDING_ACK_EXCLUSIVE_PARAGRAPH,
    ],
    checkboxLabel:
      "I understand the show pricing and estimated total, and that I am not charged to submit this request.",
    version: PORTAL_BIDDING_ACKNOWLEDGMENT_VERSION,
  };
}

/** Signup / registration acknowledgment copy (owner authoritative). */
export function buildPortalBiddingAcknowledgmentSignupCopy(): PortalBiddingAcknowledgmentCopy {
  return {
    title: "Request Portal Acknowledgment",
    paragraphs: [
      "The Fresh Prints Request Portal lets you submit designs to print for live shows at posted tiered personal-bin prices.",
      "Requesting designs does not charge you in the Portal. You commit to show pricing when you add a request to a show.",
      "Please only request designs you intend to collect from your personal bin at the show.",
      PORTAL_BIDDING_ACK_EXCLUSIVE_PARAGRAPH,
    ],
    checkboxLabel:
      "I understand show pricing works by size tier and that requesting designs does not charge me in the Portal.",
    version: PORTAL_BIDDING_ACKNOWLEDGMENT_VERSION,
  };
}

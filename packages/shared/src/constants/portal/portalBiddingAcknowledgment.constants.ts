/**
 * Versioned Portal show / personal-bin pricing acknowledgment.
 * Bump when owner-facing consent copy changes in a material way.
 */
export const PORTAL_BIDDING_ACKNOWLEDGMENT_VERSION = "portal-bidding-ack-v4" as const;

export type PortalBiddingAcknowledgmentVersion = typeof PORTAL_BIDDING_ACKNOWLEDGMENT_VERSION;

export type PortalBiddingAcknowledgmentSource = "signup" | "queue_to_show";

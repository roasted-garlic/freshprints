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

/** Add to Show / queue-to-show confirmation copy (owner authoritative). */
export function buildPortalBiddingAcknowledgmentCopy(
  _itemCount = 1,
): PortalBiddingAcknowledgmentCopy {
  return {
    title: "Add to Show Print Run",
    paragraphs: [
      "The design or designs you are adding will be printed for the selected live show and made available for public bidding.",
      "Adding designs to a show does not reserve them for you or guarantee that you will receive them. Anyone watching the show may bid, and the highest bidder will receive the design.",
      "You must be present when your requested designs are auctioned and place the winning bid. If you miss the auction or lose the bid, you may request the design again for a future show.",
      "Please only add designs that you personally intend to bid on.",
      PORTAL_BIDDING_ACK_EXCLUSIVE_PARAGRAPH,
    ],
    checkboxLabel:
      "I understand that these designs are not reserved for me and will be available for anyone to bid on during the selected live show.",
    version: PORTAL_BIDDING_ACKNOWLEDGMENT_VERSION,
  };
}

/** Signup / registration acknowledgment copy (owner authoritative). */
export function buildPortalBiddingAcknowledgmentSignupCopy(): PortalBiddingAcknowledgmentCopy {
  return {
    title: "Request Portal Acknowledgment",
    paragraphs: [
      "The Fresh Prints Request Portal allows customers to submit designs they intend to bid on during one of our live shows.",
      "Submitting a request does not reserve the design for you or guarantee that you will receive it. Once the design is presented during the live show, anyone watching may bid on and purchase it.",
      "You must be present when the design is auctioned and place the winning bid to receive it. If you miss the auction or another customer wins the design, you may submit the design again for a future show.",
      "Please only request designs that you personally intend to bid on.",
      PORTAL_BIDDING_ACK_EXCLUSIVE_PARAGRAPH,
    ],
    checkboxLabel:
      "I understand how the Fresh Prints Request Portal works and agree that requested designs will be available for anyone to bid on during the live show.",
    version: PORTAL_BIDDING_ACKNOWLEDGMENT_VERSION,
  };
}

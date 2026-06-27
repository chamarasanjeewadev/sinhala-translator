import Stripe from "stripe";

// Maps every documented Stripe decline code and card error code to a
// customer-facing message key. The translated text lives in the i18n
// dictionaries under `stripeErrors.*`; STRIPE_ERROR_MESSAGES_EN is the
// English fallback for callers without dictionary access.

export type StripeErrorKey =
  | "genericDecline"
  | "contactBank"
  | "insufficientFunds"
  | "limitExceeded"
  | "expiredCard"
  | "incorrectNumber"
  | "incorrectCvc"
  | "incorrectExpiry"
  | "incorrectZip"
  | "pinError"
  | "pinTryExceeded"
  | "authenticationRequired"
  | "authenticationFailed"
  | "cardNotSupported"
  | "duplicateTransaction"
  | "tryAgainLater"
  | "invalidAmount"
  | "testCard"
  | "checkoutUnavailable"
  | "paymentFailed";

// Stripe advises never revealing fraud-related decline reasons to the
// customer; these are reported as a plain "card_declined".
const OBFUSCATED_DECLINE_CODES = new Set([
  "fraudulent",
  "lost_card",
  "stolen_card",
  "pickup_card",
  "merchant_blacklist",
]);

// https://docs.stripe.com/declines/codes — full list of decline codes.
const DECLINE_CODE_KEYS: Record<string, StripeErrorKey> = {
  approve_with_id: "tryAgainLater",
  authentication_required: "authenticationRequired",
  call_issuer: "contactBank",
  card_not_supported: "cardNotSupported",
  card_velocity_exceeded: "limitExceeded",
  currency_not_supported: "cardNotSupported",
  do_not_honor: "contactBank",
  do_not_try_again: "contactBank",
  duplicate_transaction: "duplicateTransaction",
  expired_card: "expiredCard",
  fraudulent: "genericDecline",
  generic_decline: "genericDecline",
  incorrect_number: "incorrectNumber",
  incorrect_cvc: "incorrectCvc",
  incorrect_pin: "pinError",
  incorrect_zip: "incorrectZip",
  insufficient_funds: "insufficientFunds",
  invalid_account: "contactBank",
  invalid_amount: "invalidAmount",
  invalid_cvc: "incorrectCvc",
  invalid_expiry_month: "incorrectExpiry",
  invalid_expiry_year: "incorrectExpiry",
  invalid_number: "incorrectNumber",
  invalid_pin: "pinError",
  issuer_not_available: "tryAgainLater",
  lost_card: "genericDecline",
  merchant_blacklist: "genericDecline",
  new_account_information_available: "contactBank",
  no_action_taken: "contactBank",
  not_permitted: "contactBank",
  offline_pin_required: "pinError",
  online_or_offline_pin_required: "pinError",
  pickup_card: "genericDecline",
  pin_try_exceeded: "pinTryExceeded",
  processing_error: "tryAgainLater",
  reenter_transaction: "tryAgainLater",
  restricted_card: "contactBank",
  revocation_of_all_authorizations: "contactBank",
  revocation_of_authorization: "contactBank",
  security_violation: "contactBank",
  service_not_allowed: "contactBank",
  stolen_card: "genericDecline",
  stop_payment_order: "contactBank",
  testmode_decline: "testCard",
  transaction_not_allowed: "contactBank",
  try_again_later: "tryAgainLater",
  withdrawal_count_limit_exceeded: "limitExceeded",
};

// https://docs.stripe.com/error-codes — card-payment-related error codes
// (`error.code` / `last_payment_error.code`).
const CARD_ERROR_CODE_KEYS: Record<string, StripeErrorKey> = {
  amount_too_large: "invalidAmount",
  amount_too_small: "invalidAmount",
  authentication_required: "authenticationRequired",
  card_decline_rate_limit_exceeded: "tryAgainLater",
  card_declined: "genericDecline",
  expired_card: "expiredCard",
  incorrect_cvc: "incorrectCvc",
  incorrect_number: "incorrectNumber",
  incorrect_zip: "incorrectZip",
  invalid_cvc: "incorrectCvc",
  invalid_expiry_month: "incorrectExpiry",
  invalid_expiry_year: "incorrectExpiry",
  invalid_number: "incorrectNumber",
  payment_intent_authentication_failure: "authenticationFailed",
  postal_code_invalid: "incorrectZip",
  processing_error: "tryAgainLater",
  setup_intent_authentication_failure: "authenticationFailed",
};

export const STRIPE_ERROR_MESSAGES_EN: Record<StripeErrorKey, string> = {
  genericDecline:
    "Your card was declined. Please try a different card or payment method.",
  contactBank:
    "Your bank declined this payment without giving a reason. Please contact your bank for details, or try a different card.",
  insufficientFunds:
    "Your card has insufficient funds. Please use a different card or add funds and try again.",
  limitExceeded:
    "This payment exceeds a limit on your card. Please contact your bank or try a different card.",
  expiredCard: "Your card has expired. Please use a different card.",
  incorrectNumber:
    "The card number is incorrect. Please check it and try again.",
  incorrectCvc:
    "The card's security code (CVC) is incorrect. Please check it and try again.",
  incorrectExpiry:
    "The card's expiry date is incorrect. Please check it and try again.",
  incorrectZip:
    "The card's postal code is incorrect. Please check it and try again.",
  pinError:
    "The card's PIN is incorrect or required. Please try again or use a different card.",
  pinTryExceeded:
    "Too many incorrect PIN attempts. Please use a different card or contact your bank.",
  authenticationRequired:
    "Your bank requires extra verification for this payment. Please try again and complete the verification step.",
  authenticationFailed:
    "Your bank's security check (3D Secure) was not completed. Please try again.",
  cardNotSupported:
    "This card doesn't support this type of online purchase. Please contact your bank or use a different card.",
  duplicateTransaction:
    "An identical payment was made moments ago. Please check your payment history before trying again.",
  tryAgainLater:
    "The payment couldn't be processed right now. Please try again in a few minutes.",
  invalidAmount:
    "The payment amount is invalid. Please contact hi@helavoice.lk.",
  testCard:
    "This is a test card and can't be used for real payments. Please use a real card.",
  checkoutUnavailable:
    "We couldn't start the checkout. Please try again in a moment.",
  paymentFailed:
    "Your payment could not be completed. Please try again or use a different payment method.",
};

export interface StripeErrorInfo {
  key: StripeErrorKey;
  message: string;
  // Code safe to show the customer (fraud-related decline codes are
  // reported as "card_declined").
  code: string;
}

export function describePaymentError(
  code?: string | null,
  declineCode?: string | null
): StripeErrorInfo {
  if (declineCode && DECLINE_CODE_KEYS[declineCode]) {
    const key = DECLINE_CODE_KEYS[declineCode];
    const reportable = OBFUSCATED_DECLINE_CODES.has(declineCode)
      ? "card_declined"
      : declineCode;
    return { key, message: STRIPE_ERROR_MESSAGES_EN[key], code: reportable };
  }
  if (code && CARD_ERROR_CODE_KEYS[code]) {
    const key = CARD_ERROR_CODE_KEYS[code];
    return { key, message: STRIPE_ERROR_MESSAGES_EN[key], code };
  }
  return {
    key: "paymentFailed",
    message: STRIPE_ERROR_MESSAGES_EN.paymentFailed,
    code: code || declineCode || "payment_failed",
  };
}

// Classifies any error thrown by the Stripe SDK (e.g. while creating a
// Checkout session) into a customer-friendly message + HTTP status.
export function describeStripeError(error: unknown): {
  info: StripeErrorInfo;
  status: number;
} {
  if (error instanceof Stripe.errors.StripeCardError) {
    return {
      info: describePaymentError(error.code, error.decline_code),
      status: 402,
    };
  }
  if (error instanceof Stripe.errors.StripeRateLimitError) {
    return {
      info: {
        key: "tryAgainLater",
        message: STRIPE_ERROR_MESSAGES_EN.tryAgainLater,
        code: "rate_limited",
      },
      status: 503,
    };
  }
  if (
    error instanceof Stripe.errors.StripeConnectionError ||
    error instanceof Stripe.errors.StripeAPIError
  ) {
    return {
      info: {
        key: "checkoutUnavailable",
        message: STRIPE_ERROR_MESSAGES_EN.checkoutUnavailable,
        code: "stripe_unavailable",
      },
      status: 503,
    };
  }
  // Invalid request / authentication / unknown errors are our misconfiguration,
  // not the customer's — show a generic checkout failure.
  return {
    info: {
      key: "checkoutUnavailable",
      message: STRIPE_ERROR_MESSAGES_EN.checkoutUnavailable,
      code: "checkout_error",
    },
    status: 500,
  };
}

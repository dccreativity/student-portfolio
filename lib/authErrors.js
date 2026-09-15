// Supabase's auth errors are written for developers. These are the ones
// students and staff actually hit, in words that tell them the one thing
// they need to know: whether this is theirs to fix.
//
// The email cases matter most. When the project's SMTP credentials are
// rejected, Supabase answers every sign-up and every password reset with
// a bare HTTP 500 — so a student sees a failure that looks like their
// fault, tries again, fails again, and gives up. It is not their fault
// and there is nothing they can do about it.

const MAIL_SERVER_SIGNS = [
  "sending confirmation email",
  "sending recovery email",
  "sending magic link email",
  "error sending email",
  "smtp",
];

function looksLikeMailServerFailure(error) {
  const message = String(error?.message || "").toLowerCase();
  if (MAIL_SERVER_SIGNS.some((sign) => message.includes(sign))) return true;
  // A 500 from an endpoint whose only side effect is sending an email is
  // a mail failure, whatever the body says.
  return error?.status === 500 || error?.code === "unexpected_failure";
}

function looksLikeRateLimit(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    error?.status === 429 ||
    error?.code === "over_email_send_rate_limit" ||
    message.includes("rate limit") ||
    message.includes("you can only request this after")
  );
}

// `subject` names what the email was for, so the sentence reads properly
// wherever it is shown.
export function friendlyAuthError(error, subject = "verification code") {
  if (!error) return "";

  if (looksLikeRateLimit(error)) {
    return `Too many emails have been sent from this site in the last hour, so your ${subject} could not go out. Please wait a little and try again.`;
  }

  if (looksLikeMailServerFailure(error)) {
    return `We couldn't send your ${subject}. The school's email service is refusing to send right now — this is a settings problem on our side, not something wrong with your details, and trying again won't help. Please tell your school administrator.`;
  }

  if (error.code === "invalid_credentials" || error.status === 400) {
    return error.message;
  }

  return error.message || "Something went wrong. Please try again.";
}

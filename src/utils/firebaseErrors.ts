/**
 * Firebase Auth Error Utility
 *
 * Maps Firebase Auth error codes to user-friendly messages.
 */

export function getAuthErrorMessage(error: any): string {
  if (!error || typeof error.code !== "string") {
    return "An unexpected error occurred. Please try again.";
  }

  switch (error.code) {
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "Invalid email or password.";
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/weak-password":
      return "Your password is too weak. Please use at least 6 characters.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/network-request-failed":
      return "Network error. Please check your connection.";
    case "auth/too-many-requests":
      return "Too many failed attempts. Please try again later or reset your password.";
    default:
      return error.message || "Authentication failed. Please try again.";
  }
}

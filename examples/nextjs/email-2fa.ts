import { authClient } from "./auth-client";

export async function signInWithEmailCode(email: string, password: string) {
  const result = await authClient.signIn.email({ email, password });
  if (result.error || !result.data) return result;
  if (result.data.twoFactorRedirect) {
    const challenge = await authClient.twoFactor.sendOtp();
    return { requiresCode: true, error: challenge.error };
  }
  return { requiresCode: false, error: null };
}

export function verifyEmailCode(code: string) {
  return authClient.twoFactor.verifyOtp({ code, trustDevice: true });
}

import axios from "axios";
import { checkAndCreateBot } from "../../utils/botAuthUtils";
import { API_BASE_URL } from "../../constants/api";

export async function SignUp(
  name: string,
  email: string,
  password: string,
  organisation: string
) {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/talkument/auth/signup`,
      {
        name,
        email,
        password,
        org_name: organisation,
      }
    );

    // Auto login after signup
    await SignIn(email, password);
  } catch (error) {
    console.error("SignUp Error:", error);
    throw error;
  }
}

export async function SignIn(email: string, password: string) {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/talkument/auth/signin`,
      {
        email,
        password,
      }
    );

    // ✅ Create/check bot after login
    await checkAndCreateBot();

    return response.data;
  } catch (error) {
    console.error("SignIn Error:", error);
    throw error;
  }
}

export async function GoogleLogin(redirectUrl: string) {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/talkument/auth/google/login`,
      {
        redirect_url: redirectUrl,
      }
    );
    if (response.data.auth_url) {
      globalThis.location.href = response.data.auth_url;
    }
    return response.data;
  } catch (error) {
    console.error("GoogleLogin Error:", error);
    throw error;
  }
}

export async function GoogleCallback(code: string, redirectUrl: string) {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/talkument/auth/callback`,
      {
        code,
        redirect_url: redirectUrl,
      }
    );

    await checkAndCreateBot();
    return response.data;
  } catch (error) {
    console.error("GoogleCallback Error:", error);
    throw error;
  }
}

export async function ForgotPassword(email: string, redirectUrl: string) {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/talkument/auth/forgot-password`,
      {
        email,
        redirect_url: redirectUrl,
      }
    );
    return response.data;
  } catch (error) {
    console.error("ForgotPassword Error:", error);
    throw error;
  }
}

export async function ResetPassword(data: {
  token: string | null;
  new_password: string;
  confirm_password: string;
}) {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/talkument/auth/reset-password`,
      data
    );
    return response.data;
  } catch (error) {
    console.error("ResetPassword Error:", error);
    throw error;
  }
}

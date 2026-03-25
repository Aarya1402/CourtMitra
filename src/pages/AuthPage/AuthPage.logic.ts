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

    console.log("SignUp Success:", response.data);

    // Auto login after signup
    return await SignIn(email, password);
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

    console.log("SignIn Success:", response.data);

    // ✅ Create/check bot after login
    await checkAndCreateBot();

    return response.data;
  } catch (error) {
    console.error("SignIn Error:", error);
    throw error;
  }
}

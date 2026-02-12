import { useAuth } from "@getmocha/users-service/react";
import { useEffect } from "react";
import { useNavigate } from "react-router";

export default function AuthCallback() {
  const { exchangeCodeForSessionToken, fetchUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        await exchangeCodeForSessionToken();
        await fetchUser();
        navigate("/");
      } catch (error) {
        console.error("Authentication error:", error);
        navigate("/login");
      }
    };

    handleCallback();
  }, [exchangeCodeForSessionToken, fetchUser, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
        <p className="text-xl text-gray-700">Completing sign in...</p>
      </div>
    </div>
  );
}

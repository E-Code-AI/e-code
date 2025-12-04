import React, { FormEvent, useCallback, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

type LoginResponse = {
  token: string;
  user: {
    id: string;
    email: string;
    name?: string;
  };
};

type LocationState = {
  from?: {
    pathname: string;
  };
};

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "/api";

const emailRegex =
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@(([^<>()[\]\\.,;:\s@"]+\.)+[^<>()[\]\\.,;:\s@"]{2,})$/i;

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as LocationState;

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const validate = useCallback((): boolean => {
    let valid = true;
    setEmailError(null);
    setPasswordError(null);
    setFormError(null);

    if (!email.trim()) {
      setEmailError("Email is required.");
      valid = false;
    } else if (!emailRegex.test(email.trim())) {
      setEmailError("Please enter a valid email address.");
      valid = false;
    }

    if (!password) {
      setPasswordError("Password is required.");
      valid = false;
    } else if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      valid = false;
    }

    return valid;
  }, [email, password]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (isSubmitting) return;

      const isValid = validate();
      if (!isValid) return;

      setIsSubmitting(true);
      setFormError(null);

      try {
        const response = await fetch(`undefined/auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
        });

        if (!response.ok) {
          if (response.status === 401) {
            setFormError("Invalid email or password.");
          } else if (response.status >= 500) {
            setFormError("Server error. Please try again later.");
          } else {
            const errorData = (await response.json().catch(() => null)) as
              | { message?: string }
              | null;
            setFormError(
              errorData?.message || "Unable to log in. Please try again."
            );
          }
          return;
        }

        const data = (await response.json()) as LoginResponse;

        if (!data.token) {
          setFormError("Invalid response from server. Please try again.");
          return;
        }

        localStorage.setItem("authToken", data.token);
        localStorage.setItem("authUser", JSON.stringify(data.user));

        const redirectPath = state.from?.pathname || "/";
        navigate(redirectPath, { replace: true });
      } catch (error) {
        setFormError("Network error. Please check your connection and try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [API_BASE_URL, email, password, isSubmitting, navigate, state.from, validate]
  );

  const handleEmailChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setEmail(event.target.value);
      if (emailError) setEmailError(null);
      if (formError) setFormError(null);
    },
    [emailError, formError]
  );

  const handlePasswordChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setPassword(event.target.value);
      if (passwordError) setPasswordError(null);
      if (formError) setFormError(null);
    },
    [passwordError, formError]
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white shadow-md rounded-lg p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
          Sign in to your account
        </h1>

        {formError && (
          <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-4">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={handleEmailChange}
              disabled={isSubmitting}
              className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0 undefined`}
              placeholder="you@example.com"
            />
            {emailError && (
              <p className="mt-1 text-xs text-red-600">{emailError}</p>
            )}
          </div>

          <div className="mb-6">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={handlePasswordChange}
              disabled={isSubmitting}
              className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0 undefined`}
              placeholder="Enter your password"
            />
            {passwordError && (
              <p className="mt-1 text-xs text-red-600">{passwordError}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full flex justify-center items-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0 undefined`}
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
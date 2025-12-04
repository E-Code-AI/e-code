import React, { useState, useCallback, FormEvent, ChangeEvent } from "react";
import { useNavigate, Link } from "react-router-dom";

type RegisterFormValues = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type RegisterFormErrors = Partial<Record<keyof RegisterFormValues, string>> & {
  general?: string;
};

const initialValues: RegisterFormValues = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
};

const emailRegex =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;

const passwordMinLength = 8;

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [values, setValues] = useState<RegisterFormValues>(initialValues);
  const [errors, setErrors] = useState<RegisterFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const validate = useCallback(
    (fieldValues?: Partial<RegisterFormValues>): RegisterFormErrors => {
      const currentValues = { ...values, ...fieldValues };
      const newErrors: RegisterFormErrors = {};

      if (!currentValues.name.trim()) {
        newErrors.name = "Name is required.";
      } else if (currentValues.name.trim().length < 2) {
        newErrors.name = "Name must be at least 2 characters.";
      }

      if (!currentValues.email.trim()) {
        newErrors.email = "Email is required.";
      } else if (!emailRegex.test(currentValues.email.trim())) {
        newErrors.email = "Please enter a valid email address.";
      }

      if (!currentValues.password) {
        newErrors.password = "Password is required.";
      } else if (currentValues.password.length < passwordMinLength) {
        newErrors.password = `Password must be at least undefined characters.`;
      }

      if (!currentValues.confirmPassword) {
        newErrors.confirmPassword = "Please confirm your password.";
      } else if (currentValues.confirmPassword !== currentValues.password) {
        newErrors.confirmPassword = "Passwords do not match.";
      }

      return newErrors;
    },
    [values]
  );

  const handleChange = useCallback(
    (
      event: ChangeEvent<HTMLInputElement>
    ): void => {
      const { name, value } = event.target;
      const updatedValues = { ...values, [name]: value };
      setValues(updatedValues);

      const fieldErrors = validate({ [name]: value } as Partial<RegisterFormValues>);
      setErrors((prev) => ({
        ...prev,
        [name]: fieldErrors[name as keyof RegisterFormValues],
        general: undefined,
      }));
    },
    [values, validate]
  );

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      setErrors({});
      const validationErrors = validate();
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }

      setIsSubmitting(true);
      try {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: values.name.trim(),
            email: values.email.trim(),
            password: values.password,
          }),
        });

        if (!response.ok) {
          let message = "Registration failed. Please try again.";
          try {
            const data = await response.json();
            if (data && typeof data.message === "string") {
              message = data.message;
            }
          } catch {
            // ignore JSON parse errors and use default message
          }
          setErrors((prev) => ({ ...prev, general: message }));
          return;
        }

        navigate("/login", { replace: true });
      } catch (error) {
        setErrors((prev) => ({
          ...prev,
          general: "Network error. Please check your connection and try again.",
        }));
      } finally {
        setIsSubmitting(false);
      }
    },
    [navigate, validate, values]
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white shadow-md rounded-lg p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2 text-center">
          Create an account
        </h1>
        <p className="text-sm text-gray-600 mb-6 text-center">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Sign in
          </Link>
        </p>

        {errors.general && (
          <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-4">
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              value={values.name}
              onChange={handleChange}
              className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 undefined`}
              placeholder="Your full name"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-600">{errors.name}</p>
            )}
          </div>

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
              value={values.email}
              onChange={handleChange}
              className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 undefined`}
              placeholder="you@example.com"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600">{errors.email}</p>
            )}
          </div>

          <div className="mb-4">
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
              autoComplete="new-password"
              value={values.password}
              onChange={handleChange}
              className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 undefined`}
              placeholder="Enter a strong password"
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-600">{errors.password}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Must be at least {passwordMinLength} characters.
            </p>
          </div>

          <div className="mb-6">
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Confirm password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={values.confirmPassword}
              onChange={handleChange}
              className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 undefined`}
              placeholder="Re-enter your password"
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-red-600">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full flex justify-center items-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              isSubmitting
                ? "bg-blue-400 cursor-not-allowed"
                : "bg-blue-
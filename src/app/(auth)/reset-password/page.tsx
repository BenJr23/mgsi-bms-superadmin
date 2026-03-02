"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function ChangePasswordPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (formData.newPassword !== formData.confirmPassword) {
      setError("New passwords do not match");
      setLoading(false);
      return;
    }

    try {
      // 1. Change the password
      const { error } = await authClient.changePassword({
        currentPassword: formData.currentPassword, // The temp password
        newPassword: formData.newPassword,
        revokeOtherSessions: false,
      });

      if (error) throw new Error(error.message);

      // 2. Update passwordVerified via auth API so session/user payload stays in sync
      const verifyResult = await (authClient as any).updateUser({
        passwordVerified: true,
      });

      if (verifyResult.error) {
        throw new Error(verifyResult.error.message || "Password updated, but failed to finalize verification.");
      }

      // 3. Show success and redirect to dashboard
      setSuccess("Password updated successfully. Redirecting to dashboard...");
      setTimeout(() => {
        router.replace("/dashboard");
      }, 800);

    } catch (err: any) {
      setError(err.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-20 p-6 border rounded shadow-md bg-white">
      <h1 className="text-2xl font-bold mb-2 text-gray-800">Set New Password</h1>
      <p className="text-sm text-gray-500 mb-6">
        Please update the temporary password provided by your admin.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        {/* Current Password Field */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Current Password</label>
          <input
            name="currentPassword"
            type="password"
            placeholder="The password admin gave you"
            value={formData.currentPassword}
            onChange={handleChange}
            className="p-2 border rounded text-black"
            required
          />
        </div>

        {/* New Password Field */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">New Password</label>
          <input
            name="newPassword"
            type="password"
            placeholder="Enter new password"
            value={formData.newPassword}
            onChange={handleChange}
            className="p-2 border rounded text-black"
            required
          />
        </div>

        {/* Confirm Password Field */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Confirm Password</label>
          <input
            name="confirmPassword"
            type="password"
            placeholder="Confirm new password"
            value={formData.confirmPassword}
            onChange={handleChange}
            className="p-2 border rounded text-black"
            required
          />
        </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
          {success && <p className="text-green-600 text-sm">{success}</p>}

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50 mt-2"
        >
          {loading ? "Updating..." : "Update Password"}
        </button>
      </form>
    </div>
  );
}
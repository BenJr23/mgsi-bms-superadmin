import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { authClient } from '@/lib/auth-client';
import { ProfilePicModal } from './Modals/ProfilePicModal';
import {
  Camera,
  Mail,
  Phone,
  Shield,
  Calendar,
  Lock,
  User,
  Pencil,
  X,
  Check } from
'lucide-react';
type ProfileViewProps = {
  userName: string;
  userEmail: string;
  userRole: 'ADMIN' | 'SUPERADMIN';
  userImage: string | null;
  userPhone: string;
  userCreatedAt: string | null;
  lastLogin: string | null;
  onProfileUpdate?: (updates: { name?: string; image?: string; phoneNumber?: string }) => void;
};

export function ProfileView({ userName, userEmail, userRole, userImage, userPhone, userCreatedAt, lastLogin, onProfileUpdate }: ProfileViewProps) {
  const [isPasswordUpdating, setIsPasswordUpdating] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isProfilePicOpen, setIsProfilePicOpen] = useState(false);
  const [localImageUrl, setLocalImageUrl] = useState<string | null>(userImage);
  const [localImageObjectUrl, setLocalImageObjectUrl] = useState<string | null>(null);
  const [isPersonalInfoEditing, setIsPersonalInfoEditing] = useState(false);
  const [personalInfoError, setPersonalInfoError] = useState('');
  const [personalInfoSuccess, setPersonalInfoSuccess] = useState('');

  const formatPhilippinePhone = (value: string): string => {
    // Extract only digits
    const digits = value.replace(/\D/g, '');
    // Keep only last 10 digits (to handle stored format with country code)
    const cleaned = digits.slice(-10);
    // Format as +63 XXX XXX XXXX
    if (cleaned.length === 0) return '+63 ';
    if (cleaned.length <= 3) return `+63 ${cleaned}`;
    if (cleaned.length <= 6) return `+63 ${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
    return `+63 ${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  };

  const validatePhilippinePhone = (value: string): boolean => {
    const digits = value.replace(/\D/g, '');
    return digits.length === 10 && digits[0] === '9';
  };

  const userInitials = useMemo(() => {
    const initials = userName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');

    return initials || (userRole === 'SUPERADMIN' ? 'SA' : 'AD');
  }, [userName, userRole]);

  const [formData, setFormData] = useState({
    name: userName,
    email: userEmail,
    phone: formatPhilippinePhone(userPhone),
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      name: userName,
      email: userEmail,
      phone: formatPhilippinePhone(userPhone)
    }));
  }, [userName, userEmail, userPhone]);

  useEffect(() => {
    setLocalImageUrl(userImage);
  }, [userImage]);

  useEffect(() => () => {
    if (localImageObjectUrl) {
      URL.revokeObjectURL(localImageObjectUrl);
    }
  }, [localImageObjectUrl]);

  const handlePersonalInfoEdit = () => {
    setIsPersonalInfoEditing(true);
  };

  const handlePersonalInfoSave = async () => {
    try {
      setPersonalInfoError('');
      setPersonalInfoSuccess('');
      
      // Extract digits only from the phone (remove +63 and spaces), get last 10 digits
      const phoneDigitsOnly = formData.phone.replace(/\D/g, '').slice(-10);
      
      if (!formData.name.trim()) {
        setPersonalInfoError('Name is required.');
        return;
      }
      
      if (phoneDigitsOnly.length !== 10 || phoneDigitsOnly[0] !== '9') {
        setPersonalInfoError('Please enter a valid Philippine phone number.');
        return;
      }

      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          phoneNumber: `+63${phoneDigitsOnly}`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error || 'Failed to update profile.');
      }

      setPersonalInfoSuccess('Personal information updated successfully.');
      setIsPersonalInfoEditing(false);
      
      // Notify parent of profile update
      if (onProfileUpdate) {
        onProfileUpdate({
          name: formData.name,
          phoneNumber: `+63${phoneDigitsOnly}`
        });
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => setPersonalInfoSuccess(''), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update profile.';
      setPersonalInfoError(message);
    }
  };

  const handlePersonalInfoCancel = () => {
    setFormData((prev) => ({
      ...prev,
      name: userName,
      phone: formatPhilippinePhone(userPhone)
    }));
    setPersonalInfoError('');
    setPersonalInfoSuccess('');
    setIsPersonalInfoEditing(false);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow digits to be input
    const digitsOnly = value.replace(/\D/g, '');
    if (digitsOnly.length <= 10) {
      const formatted = formatPhilippinePhone(value);
      setFormData({
        ...formData,
        phone: formatted
      });
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordUpdate = async () => {
    setIsPasswordUpdating(true);
    setPasswordError('');
    setPasswordSuccess('');

    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      setPasswordError('Please fill out all password fields.');
      setIsPasswordUpdating(false);
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setPasswordError('New passwords do not match.');
      setIsPasswordUpdating(false);
      return;
    }

    try {
      const { error } = await authClient.changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
        revokeOtherSessions: true
      });

      if (error) throw new Error(error.message);

      const verifyRes = await fetch('/api/user/verify-password', {
        method: 'POST'
      });

      if (!verifyRes.ok) {
        const verifyData = await verifyRes.json().catch(() => ({}));
        throw new Error(verifyData?.error || 'Password updated, but failed to finalize verification.');
      }

      setFormData((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
      setPasswordSuccess('Password updated successfully.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update password.';
      setPasswordError(message);
    } finally {
      setIsPasswordUpdating(false);
    }
  };

  const handleProfilePicUpload = async (file: File | null, imageUrl?: string) => {
    if (!file) return;

    if (localImageObjectUrl) {
      URL.revokeObjectURL(localImageObjectUrl);
    }

    // Use the Supabase public URL returned from the backend
    if (imageUrl) {
      setLocalImageUrl(imageUrl);
      setLocalImageObjectUrl(null);
      
      // Notify parent of profile picture update
      if (onProfileUpdate) {
        onProfileUpdate({ image: imageUrl });
      }
    } else {
      // Fallback to object URL for preview if no imageUrl provided
      const objectUrl = URL.createObjectURL(file);
      setLocalImageObjectUrl(objectUrl);
      setLocalImageUrl(objectUrl);
    }
  };

  const formatLastLogin = (dateString: string | null): string => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined }) + ' ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const formatJoinDate = (dateString: string | null): string => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const hasPersonalInfoChanges = formData.name !== userName || formData.phone !== formatPhilippinePhone(userPhone);
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
          <p className="text-slate-500">
            Manage your account settings and preferences.
          </p>
        </div>
      </div>

      {/* Header Card */}
      <Card className="relative overflow-visible">
        <div className="h-24 sm:h-32 bg-gradient-to-r from-red-900 to-red-950 rounded-t-xl -mx-6 -mt-6 mb-12 sm:mb-16"></div>
        <div className="absolute top-12 sm:top-16 left-4 sm:left-6">
          <div className="relative group">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white p-1 shadow-lg">
              {localImageUrl ?
              <Image
                src={localImageUrl}
                alt={formData.name}
                width={96}
                height={96}
                className="w-full h-full rounded-full object-cover border-2 border-white" /> :

              <div className="w-full h-full rounded-full bg-red-100 flex items-center justify-center text-red-900 text-2xl sm:text-3xl font-bold border-2 border-white">
                  {userInitials}
                </div>
              }
            </div>
            <button
              className="absolute bottom-0 right-0 p-1.5 sm:p-2 bg-white rounded-full shadow-md border border-slate-200 text-slate-600 hover:text-red-900 transition-colors"
              onClick={() => setIsProfilePicOpen(true)}>
              <Camera className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              {formData.name}
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-sm sm:text-base text-slate-500">
              <div className="flex items-center gap-1">
                <Mail className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="truncate max-w-[250px]">{formData.email}</span>
              </div>
              <span className="hidden sm:inline">•</span>
              <Badge variant="info" className="ml-0">
                {userRole}
              </Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 sm:gap-4 text-xs sm:text-sm text-slate-500">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Joined {formatJoinDate(userCreatedAt)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Shield className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>2FA Enabled</span>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Personal Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <User className="w-5 h-5 text-slate-400" />
                Personal Information
              </h3>
              {!isPersonalInfoEditing ?
              <Button variant="ghost" size="sm" className="text-red-900" onClick={handlePersonalInfoEdit}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit
              </Button> :
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-slate-600 hover:text-red-900"
                  onClick={handlePersonalInfoCancel}>
                  <X className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-emerald-600 hover:text-emerald-700"
                  onClick={handlePersonalInfoSave}
                  disabled={!hasPersonalInfoChanges}>
                  <Check className="w-4 h-4" />
                </Button>
              </div>
              }
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                  setFormData({
                    ...formData,
                    name: e.target.value
                  })
                  }
                  disabled={!isPersonalInfoEditing}
                  className={`w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-900 focus:border-transparent ${
                    isPersonalInfoEditing ? '' : 'bg-slate-50 cursor-not-allowed text-slate-600'
                  }`} />

              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Phone Number
                </label>
                <div className="relative flex items-center">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 z-10" />
                  <span className="absolute left-9 top-1/2 -translate-y-1/2 text-slate-500 font-medium text-sm">
                    +63
                  </span>
                  <input
                    type="tel"
                    placeholder="9XX XXX XXXX"
                    value={formData.phone.replace('+63 ', '')}
                    onChange={handlePhoneChange}
                    disabled={!isPersonalInfoEditing}
                    maxLength={14}
                    className={`w-full pl-20 pr-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-900 focus:border-transparent ${
                      isPersonalInfoEditing ? '' : 'bg-slate-50 cursor-not-allowed text-slate-600'
                    }`} />

                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-700">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="email"
                    value={formData.email}
                    readOnly
                    className="w-full pl-9 pr-10 py-2 border border-slate-200 bg-slate-50 text-slate-500 rounded-md cursor-not-allowed" />

                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                </div>
                <p className="text-xs text-slate-500">
                  Contact system administrator to change your email address.
                </p>
              </div>
            </div>

            {personalInfoError ?
            <p className="text-sm text-red-600 mt-4">
                {personalInfoError}
              </p> :
            null
            }
            {personalInfoSuccess ?
            <p className="text-sm text-emerald-600 mt-4">
                {personalInfoSuccess}
              </p> :
            null
            }
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
              <Shield className="w-5 h-5 text-slate-400" />
              Security
            </h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Current Password
                </label>
                <input
                  type="password"
                  name="currentPassword"
                  value={formData.currentPassword}
                  onChange={handlePasswordChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-900 focus:border-transparent"
                  placeholder="••••••••" />

              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    New Password
                  </label>
                  <input
                    type="password"
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-900 focus:border-transparent" />

                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-900 focus:border-transparent" />

                </div>
              </div>

              {passwordError ?
              <p className="text-sm text-red-600">
                  {passwordError}
                </p> :
              null
              }
              {passwordSuccess ?
              <p className="text-sm text-emerald-600">
                  {passwordSuccess}
                </p> :
              null
              }

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handlePasswordUpdate}
                  disabled={isPasswordUpdating}>
                  {isPasswordUpdating ? 'Updating...' : 'Update Password'}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column - Account Stats */}
        <div className="space-y-6">
          <Card>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
              Account Details
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-slate-50">
                <span className="text-sm text-slate-600">Role</span>
                <Badge variant="info">{userRole}</Badge>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-50">
                <span className="text-sm text-slate-600">Status</span>
                <Badge variant="success">Active</Badge>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-slate-600">Last Login</span>
                <span className="text-sm font-medium text-slate-900">
                  {formatLastLogin(lastLogin)}
                </span>
              </div>
            </div>
          </Card>

          <Card className="bg-slate-50 border-slate-200">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm text-red-900">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-medium text-slate-900">Two-Factor Auth</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Extra layer of security to the account is active.
                </p>
                
              </div>
            </div>
          </Card>
        </div>
      </div>
      <ProfilePicModal
        isOpen={isProfilePicOpen}
        currentImage={localImageUrl}
        onClose={() => setIsProfilePicOpen(false)}
        onUpload={handleProfilePicUpload} />
    </div>);

}
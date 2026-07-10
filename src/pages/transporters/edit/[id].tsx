// frontend/src/components/transporters/EditTransporterModal.tsx
import React, { useState, useEffect } from 'react';
import { toast } from '@/components/ui/use-toast';
import {
  Mail,
  Phone,
  Building2,
  X,
  Loader2,
  AlertCircle,
  MapPin,
  Truck,
  Lock,
  Eye,
  EyeOff,
  Image,
  Globe,
  Hash,
  Save,
} from 'lucide-react';
import { transportersService } from '@/api/services/transporters/transporters.service';

interface EditTransporterModalProps {
  isOpen: boolean;
  transporterId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormErrors {
  [key: string]: string | undefined;
  submit?: string;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  secondaryEmail: string;
  additionalEmail: string;
  password: string;
  confirmPassword: string;
  companyName: string;
  gstNumber: string;
  website: string;
  address: string;
  profilePicture: File | null;
}

const emptyForm: FormData = {
  name: '',
  email: '',
  phone: '',
  secondaryEmail: '',
  additionalEmail: '',
  password: '',
  confirmPassword: '',
  companyName: '',
  gstNumber: '',
  website: '',
  address: '',
  profilePicture: null,
};

const API_ORIGIN = (import.meta.env.VITE_API_BASE || 'http://101.53.150.120:5000').replace(/\/api\/?$/, '');

const getImageUrl = (url?: string | null) => {
  if (!url) return null;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  return `${API_ORIGIN}${url.startsWith('/') ? url : `/${url}`}`;
};

export function EditTransporterModal({ isOpen, transporterId, onClose, onSuccess }: EditTransporterModalProps) {
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [originalData, setOriginalData] = useState<FormData>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  const [originalProfilePicture, setOriginalProfilePicture] = useState<string | null>(null);

  // Fetch transporter data when modal opens
  useEffect(() => {
    if (isOpen && transporterId) {
      fetchTransporter(transporterId);
    }
  }, [isOpen, transporterId]);

  const fetchTransporter = async (id: string) => {
    try {
      setLoading(true);
      const response:any = await transportersService.getById(id);
      const data = response.data || response;

      const transporterData: FormData = {
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        secondaryEmail: data.secondaryEmail || '',
        additionalEmail: data.additionalEmail || '',
        password: '',
        confirmPassword: '',
        companyName: data.companyName || '',
        gstNumber: data.gstNumber || '',
        website: data.website || '',
        address: data.address?.street || data.address || '',
        profilePicture: null,
      };

      setFormData(transporterData);
      setOriginalData(transporterData);
      
      // Set profile picture preview if exists
      const profileImage = getImageUrl(
        data.profilePicture ||
          data.profileImage ||
          data.profilePhoto ||
          data.avatar ||
          data.profile ||
          data.user?.profilePicture ||
          data.user?.avatar ||
          data.user?.profile
      );
      setOriginalProfilePicture(profileImage);
      setProfilePicturePreview(profileImage);
      
      setErrors({});
      setTouched({});
    } catch (error: any) {
      console.error('Failed to fetch transporter:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to load transporter data',
        variant: 'destructive',
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const validateField = (name: string, value: string | File | null): boolean => {
    const newErrors = { ...errors };

    switch (name) {
      case 'name':
        if (!value) newErrors.name = 'Name is required';
        else if (String(value).trim().length < 2) newErrors.name = 'Name must be at least 2 characters';
        else delete newErrors.name;
        break;
      case 'email':
        if (!value) newErrors.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(String(value))) newErrors.email = 'Enter a valid email';
        else delete newErrors.email;
        break;
      case 'phone':
        if (!value) newErrors.phone = 'Mobile number is required';
        else if (String(value).trim().length < 8) newErrors.phone = 'Mobile number must be at least 8 characters';
        else delete newErrors.phone;
        break;
      case 'secondaryEmail':
        if (value && !/\S+@\S+\.\S+/.test(String(value))) {
          newErrors.secondaryEmail = 'Enter a valid email';
        } else {
          delete newErrors.secondaryEmail;
        }
        break;
      case 'additionalEmail':
        if (value && !/\S+@\S+\.\S+/.test(String(value))) {
          newErrors.additionalEmail = 'Enter a valid email';
        } else {
          delete newErrors.additionalEmail;
        }
        break;
      case 'password':
        if (value && String(value).length < 8) {
          newErrors.password = 'Password must be at least 8 characters';
        } else {
          delete newErrors.password;
        }
        break;
      case 'confirmPassword':
        if (value && String(value) !== formData.password) {
          newErrors.confirmPassword = 'Passwords do not match';
        } else {
          delete newErrors.confirmPassword;
        }
        break;
      case 'companyName':
        if (!value) newErrors.companyName = 'Company name is required';
        else if (String(value).trim().length < 2) newErrors.companyName = 'Company name must be at least 2 characters';
        else delete newErrors.companyName;
        break;
      case 'gstNumber':
        if (!value) newErrors.gstNumber = 'GST number is required';
        else if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(String(value))) {
          newErrors.gstNumber = 'Enter a valid GST number (e.g., 22AAAAA0000A1Z5)';
        } else {
          delete newErrors.gstNumber;
        }
        break;
      case 'address':
        if (!value) newErrors.address = 'Address is required';
        else if (String(value).trim().length < 5) newErrors.address = 'Address must be at least 5 characters';
        else delete newErrors.address;
        break;
      default:
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (touched[name]) validateField(name, value);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTouched({ ...touched, [name]: true });
    validateField(name, value);
  };

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData({ ...formData, profilePicture: file });
    
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setProfilePicturePreview(originalProfilePicture);
    }
  };

  const hasChanges = () => {
    const fieldsToCheck = ['name', 'email', 'phone', 'secondaryEmail', 'additionalEmail', 'companyName', 'gstNumber', 'website', 'address'];
    for (const field of fieldsToCheck) {
      if (formData[field as keyof FormData] !== originalData[field as keyof FormData]) {
        return true;
      }
    }
    if (formData.password && formData.password !== '') return true;
    if (formData.profilePicture !== null) return true;
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all required fields
    const requiredFields = ['name', 'email', 'phone', 'companyName', 'gstNumber', 'address'];
    let hasError = false;
    const nextErrors: FormErrors = {};

    requiredFields.forEach((field) => {
      const value = formData[field as keyof FormData];
      if (!value || String(value).trim() === '') {
        nextErrors[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
        hasError = true;
      }
    });

    // Validate email format
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      nextErrors.email = 'Enter a valid email';
      hasError = true;
    }

    // Validate phone
    if (formData.phone && formData.phone.length < 8) {
      nextErrors.phone = 'Mobile number must be at least 8 characters';
      hasError = true;
    }

    // Validate password if provided
    if (formData.password && formData.password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters';
      hasError = true;
    }

    // Validate password match if password is provided
    if (formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match';
      hasError = true;
    }

    if (hasError) {
      setErrors(nextErrors);
      toast({
        title: 'Validation Errors',
        description: 'Please fix all highlighted fields',
        variant: 'destructive',
      });
      return;
    }

    if (!hasChanges()) {
      toast({
        title: 'No Changes',
        description: 'You haven\'t made any changes.',
        variant: 'default',
      });
      return;
    }

    setSubmitting(true);
    try {
      // Prepare data for API
      const submitData: any = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        secondaryEmail: formData.secondaryEmail || undefined,
        additionalEmail: formData.additionalEmail || undefined,
        companyName: formData.companyName,
        gstNumber: formData.gstNumber,
        website: formData.website || undefined,
        address: {
          street: formData.address,
          city: '',
          state: '',
          pincode: '',
          country: 'India',
        },
      };

      // Only include password if it's provided
      if (formData.password) {
        submitData.password = formData.password;
      }

      // Include profile picture if it's provided
      if (formData.profilePicture) {
        submitData.profilePicture = formData.profilePicture;
      }

      await transportersService.update(transporterId!, submitData);
      
      toast({
        title: 'Transporter updated',
        description: `Transporter ${formData.name} has been updated successfully.`,
      });
      
      onSuccess();
      onClose();
    } catch (err: any) {
      const message = err?.data?.message || err?.message || 'Failed to update transporter';
      setErrors({ submit: message });
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-300">
        {/* Modal Header */}
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-full">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-primary">Edit Transporter</h3>
              <p className="text-sm text-gray-500">
                {loading ? 'Loading...' : `Update details for ${formData.name}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-gray-100 transition-colors"
            disabled={submitting || loading}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            <p className="mt-4 text-sm text-gray-500">Loading transporter data...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {errors.submit && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{errors.submit}</span>
              </div>
            )}

            {/* Personal Information */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2 border-b pb-2">
                <Truck className="w-4 h-4" />
                Personal Information
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Profile Picture
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="cursor-pointer">
                        <div className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                          <Image className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">Choose Photo</span>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleProfilePictureChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                    {profilePicturePreview && (
                      <div className="w-12 h-12 rounded-full overflow-hidden border border-gray-200">
                        <img src={profilePicturePreview} alt="Profile picture preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all ${
                      errors.name && touched.name ? 'border-red-500' : 'border-gray-200'
                    }`}
                    placeholder="Enter your name"
                  />
                  {errors.name && touched.name && (
                    <p className="mt-1.5 text-xs text-red-500">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={`w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all ${
                        errors.email && touched.email ? 'border-red-500' : 'border-gray-200'
                      }`}
                      placeholder="Enter your email"
                    />
                  </div>
                  {errors.email && touched.email && (
                    <p className="mt-1.5 text-xs text-red-500">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mobile <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={`w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all ${
                        errors.phone && touched.phone ? 'border-red-500' : 'border-gray-200'
                      }`}
                      placeholder="Enter your mobile number"
                    />
                  </div>
                  {errors.phone && touched.phone && (
                    <p className="mt-1.5 text-xs text-red-500">{errors.phone}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Secondary Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      name="secondaryEmail"
                      type="email"
                      value={formData.secondaryEmail}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={`w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all ${
                        errors.secondaryEmail && touched.secondaryEmail ? 'border-red-500' : 'border-gray-200'
                      }`}
                      placeholder="Enter secondary email"
                    />
                  </div>
                  {errors.secondaryEmail && touched.secondaryEmail && (
                    <p className="mt-1.5 text-xs text-red-500">{errors.secondaryEmail}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password <span className="text-gray-400 text-xs">(Leave blank to keep current)</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={`w-full pl-10 pr-10 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all ${
                        errors.password && touched.password ? 'border-red-500' : 'border-gray-200'
                      }`}
                      placeholder="Enter new password (optional)"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && touched.password && (
                    <p className="mt-1.5 text-xs text-red-500">{errors.password}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={`w-full pl-10 pr-10 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all ${
                        errors.confirmPassword && touched.confirmPassword ? 'border-red-500' : 'border-gray-200'
                      }`}
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && touched.confirmPassword && (
                    <p className="mt-1.5 text-xs text-red-500">{errors.confirmPassword}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Company Information */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2 border-b pb-2">
                <Building2 className="w-4 h-4" />
                Company Information
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={`w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all ${
                        errors.companyName && touched.companyName ? 'border-red-500' : 'border-gray-200'
                      }`}
                      placeholder="Enter your company name"
                    />
                  </div>
                  {errors.companyName && touched.companyName && (
                    <p className="mt-1.5 text-xs text-red-500">{errors.companyName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    GST Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      name="gstNumber"
                      value={formData.gstNumber}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={`w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all ${
                        errors.gstNumber && touched.gstNumber ? 'border-red-500' : 'border-gray-200'
                      }`}
                      placeholder="Enter your GST number"
                    />
                  </div>
                  {errors.gstNumber && touched.gstNumber && (
                    <p className="mt-1.5 text-xs text-red-500">{errors.gstNumber}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Website
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      name="website"
                      value={formData.website}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                      placeholder="Enter your company website"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <textarea
                    name="address"
                    rows={1}
                    value={formData.address}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all resize-none ${
                      errors.address && touched.address ? 'border-red-500' : 'border-gray-200'
                    }`}
                    placeholder="Enter your company address"
                  />
                </div>
                {errors.address && touched.address && (
                  <p className="mt-1.5 text-xs text-red-500">{errors.address}</p>
                )}
              </div>
            </div>

            {/* Change Summary */}
            {hasChanges() && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Unsaved Changes</p>
                    <p className="text-sm text-amber-700 mt-0.5">
                      You have made changes to this transporter's details.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-100">
              <button
                type="submit"
                disabled={submitting || !hasChanges()}
                className="flex-1 px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-gray-800 transition-colors shadow-sm text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Update Transporter
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-6 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default EditTransporterModal

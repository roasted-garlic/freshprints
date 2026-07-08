import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "").replace(/^\//, "");

function apiUrl(path: string): string {
  const base = API_BASE ? `/${API_BASE}` : "";
  return `${base}/api${path}`;
}

export interface CustomerOrder {
  id: string;
  name: string;
  processedAt: string;
  financialStatus: string;
  fulfillmentStatus: string;
  totalPrice: { amount: string; currencyCode: string };
  lineItems: {
    nodes: Array<{
      name: string;
      quantity: number;
      image: { url: string; altText: string | null } | null;
      price: { amount: string; currencyCode: string };
    }>;
  };
}

export interface CustomerAddress {
  id: string;
  address1: string;
  address2: string | null;
  city: string;
  province: string;
  zip: string;
  country: string;
}

export interface CustomerProfile {
  id: string;
  firstName: string;
  lastName: string;
  emailAddress: { emailAddress: string } | null;
  defaultAddress: CustomerAddress | null;
  addresses?: { nodes: CustomerAddress[] };
  orders: { nodes: CustomerOrder[] };
}

interface AuthState {
  isLoggedIn: boolean;
  isLoading: boolean;
  firstName?: string;
  lastName?: string;
  email?: string;
}

interface AuthContextValue {
  auth: AuthState;
  login: (returnTo?: string) => void;
  logout: () => void;
  checkSession: () => Promise<void>;
  fetchProfile: () => Promise<CustomerProfile | null>;
  updateCustomer: (firstName: string, lastName: string, email: string) => Promise<void>;
  addAddress: (address: Omit<CustomerAddress, 'id'>) => Promise<void>;
  updateAddress: (id: string, address: Omit<CustomerAddress, 'id'>) => Promise<void>;
  deleteAddress: (id: string) => Promise<void>;
  setDefaultAddress: (id: string, address: Record<string, unknown>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({ isLoggedIn: false, isLoading: true });

  const checkSession = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/auth/session"), { credentials: "include" });
      if (!res.ok) {
        setAuth({ isLoggedIn: false, isLoading: false });
        return;
      }
      const data = await res.json() as {
        isLoggedIn: boolean;
        firstName?: string;
        lastName?: string;
        email?: string;
      };
      setAuth({ ...data, isLoading: false });
    } catch {
      setAuth({ isLoggedIn: false, isLoading: false });
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const login = useCallback((returnTo?: string) => {
    const url = returnTo
      ? `${apiUrl("/auth/login")}?returnTo=${encodeURIComponent(returnTo)}`
      : apiUrl("/auth/login");
    window.location.href = url;
  }, []);

  const logout = useCallback(() => {
    window.location.href = apiUrl("/auth/logout");
  }, []);

  const fetchProfile = useCallback(async (): Promise<CustomerProfile | null> => {
    try {
      const res = await fetch(apiUrl("/auth/me?refresh=1"), { credentials: "include" });
      if (!res.ok) return null;
      return await res.json() as CustomerProfile;
    } catch {
      return null;
    }
  }, []);

  const updateCustomer = useCallback(async (firstName: string, lastName: string, email: string): Promise<void> => {
    const res = await fetch(apiUrl("/auth/customer"), {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName, email }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to update profile");
    }
  }, []);

  const addAddress = useCallback(async (address: Omit<CustomerAddress, 'id'>): Promise<void> => {
    const res = await fetch(apiUrl("/auth/customer/address"), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(address),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to add address");
    }
  }, []);

  const updateAddress = useCallback(async (id: string, address: Omit<CustomerAddress, 'id'>): Promise<void> => {
    const res = await fetch(apiUrl(`/auth/customer/address/${id}`), {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(address),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to update address");
    }
  }, []);

  const deleteAddress = useCallback(async (id: string): Promise<void> => {
    const res = await fetch(apiUrl(`/auth/customer/address/${id}`), {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to delete address");
    }
  }, []);

  const setDefaultAddress = useCallback(async (id: string, address: Record<string, unknown>): Promise<void> => {
    const res = await fetch(apiUrl("/auth/customer/address/set-default"), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...address }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to set default address");
    }
  }, []);

  return (
    <AuthContext.Provider value={{ auth, login, logout, checkSession, fetchProfile, updateCustomer, addAddress, updateAddress, deleteAddress, setDefaultAddress }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

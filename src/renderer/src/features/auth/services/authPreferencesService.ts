const rememberMeStorageKey = "fresh-prints-auth-remember-me";
const emailStorageKey = "fresh-prints-auth-email";

export const authPreferencesService = {
  getRememberMe(): boolean {
    const storedValue = window.localStorage.getItem(rememberMeStorageKey);

    if (storedValue === "false") {
      return false;
    }

    return true;
  },

  getStoredEmail(): string {
    if (!this.getRememberMe()) {
      return "";
    }

    return window.localStorage.getItem(emailStorageKey)?.trim() ?? "";
  },

  storeRememberMe(rememberMe: boolean): void {
    window.localStorage.setItem(rememberMeStorageKey, rememberMe ? "true" : "false");
  },

  storeLoginPreferences(email: string, rememberMe: boolean): void {
    this.storeRememberMe(rememberMe);

    if (rememberMe) {
      window.localStorage.setItem(emailStorageKey, email.trim().toLowerCase());
      return;
    }

    window.localStorage.removeItem(emailStorageKey);
  },
};

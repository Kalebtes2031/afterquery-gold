// src/utils/sessionManager.ts — Complete Session & Token Management
interface SessionData {
  token: string;
  expiresAt: number;
  user: {
    uid: string;
    email: string;
    name: string;
    role: string;
    phone: string;
    branchId?: string | null;
    branchName?: string | null;
  };
}

class SessionManager {
  private static SESSION_KEY = 'laundry_session';
  private static CHECK_INTERVAL = 60000; // Check every minute
  private checkTimer: NodeJS.Timeout | null = null;
  private onExpireCallback: (() => void) | null = null;

  // Store session data
  setSession(data: SessionData): void {
    try {
      localStorage.setItem(SessionManager.SESSION_KEY, JSON.stringify(data));
      this.startExpiryCheck();
      // console.log('✅ Session stored, expires at:', new Date(data.expiresAt).toLocaleString());
    } catch (error) {
      console.error('Failed to store session:', error);
    }
  }

  // Get session data
  getSession(): SessionData | null {
    try {
      const data = localStorage.getItem(SessionManager.SESSION_KEY);
      if (!data) return null;

      const session: SessionData = JSON.parse(data);
      
      // Check if expired
      if (this.isExpired(session.expiresAt)) {
        console.log('⏰ Session expired');
        this.clearSession();
        if (this.onExpireCallback) {
          this.onExpireCallback();
        }
        return null;
      }

      return session;
    } catch (error) {
      console.error('Failed to read session:', error);
      return null;
    }
  }

  // Get JWT token
  getToken(): string | null {
    const session = this.getSession();
    return session?.token || null;
  }

  // Get user data from session
  getUser() {
    const session = this.getSession();
    return session?.user || null;
  }

  // Check if session is active
  isActive(): boolean {
    const session = this.getSession();
    return session !== null && !this.isExpired(session.expiresAt);
  }

  // Check if session is expired
  private isExpired(expiresAt: number): boolean {
    return Date.now() >= expiresAt;
  }

  // Clear session (logout)
  clearSession(): void {
    localStorage.removeItem(SessionManager.SESSION_KEY);
    this.stopExpiryCheck();
    console.log('🔓 Session cleared');
  }

  // Get API headers with auth token
  getHeaders(): Record<string, string> {
    const token = this.getToken();
    const apiKey = import.meta.env.VITE_API_KEY || '';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  // Get base API URL
  getBaseUrl(): string {
    return import.meta.env.VITE_API_URL || '';
  }

  // Set callback for session expiry
  onExpire(callback: () => void): void {
    this.onExpireCallback = callback;
  }

  // Start checking for session expiry
  private startExpiryCheck(): void {
    if (this.checkTimer) return;

    this.checkTimer = setInterval(() => {
      const session = this.getSession();
      if (!session || this.isExpired(session.expiresAt)) {
        console.log('⏰ Session expired during periodic check');
        this.clearSession();
        if (this.onExpireCallback) {
          this.onExpireCallback();
        }
      }
    }, SessionManager.CHECK_INTERVAL);
  }

  // Stop checking for session expiry
  private stopExpiryCheck(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
  }

  // Get time until expiry in milliseconds
  getTimeUntilExpiry(): number | null {
    const session = this.getSession();
    if (!session) return null;
    return session.expiresAt - Date.now();
  }

  // Make authenticated API request
  async fetchApi(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.getBaseUrl()}${endpoint}`;
    const headers = {
      ...this.getHeaders(),
      ...options.headers,
    };

    return fetch(url, {
      ...options,
      headers,
    });
  }
}

// Export singleton instance
const sessionManager = new SessionManager();
export default sessionManager;
export { sessionManager };
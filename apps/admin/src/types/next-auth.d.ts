import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  /**
   * Admin sessions only ever represent an admin user. Customer sessions
   * cannot reach this app — they live in a different bundle on a different
   * cookie name — but the union below excludes `customer` defensively too.
   */
  interface Session {
    user: {
      id: string;
      role: "owner" | "manager" | "staff";
      isSuperAdmin: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: "owner" | "manager" | "staff";
    isSuperAdmin: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "owner" | "manager" | "staff";
    isSuperAdmin: boolean;
  }
}

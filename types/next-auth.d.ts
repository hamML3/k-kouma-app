import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      // Permissions du compte modérateur (vide/ignoré pour les autres rôles) —
      // voir lib/permissions.ts. Toujours un tableau, jamais undefined.
      permissions: string[];
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
    pwdChangedAt?: number | null;
    permissions?: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    pwdChangedAt?: number | null;
    permissions?: string[];
  }
}

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validators/auth";
import { normalizePermissions } from "@/lib/permissions";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            passwordHash: true,
            role: true,
            status: true,
            passwordChangedAt: true,
            permissions: true,
          },
        });

        if (!user || user.status !== "active") return null;

        const passwordMatch = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatch) return null;

        return {
          id: String(user.id),
          email: user.email,
          role: user.role,
          pwdChangedAt: user.passwordChangedAt?.getTime() ?? null,
          permissions: normalizePermissions(user.permissions),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // First sign-in: populate from the authorize() result
        token.id = user.id;
        token.role = user.role;
        token.pwdChangedAt = user.pwdChangedAt ?? null;
        token.permissions = user.permissions ?? [];
        return token;
      }

      if (!token.id) return token;

      // Subsequent requests: always re-read from DB so suspensions,
      // password changes and permission grants/revocations take effect
      // immediately, not just at next sign-in — a JWT would otherwise stay
      // valid for its full lifetime regardless.
      const dbUser = await prisma.user.findUnique({
        where: { id: Number(token.id) },
        select: { role: true, status: true, passwordChangedAt: true, permissions: true },
      });

      if (!dbUser || dbUser.status !== "active") return null;

      const dbPwdChangedAt = dbUser.passwordChangedAt?.getTime() ?? null;
      if (dbPwdChangedAt !== null && dbPwdChangedAt !== token.pwdChangedAt) {
        // Mot de passe changé depuis l'émission de ce token (reset, ou
        // changement ailleurs) : la session en cours doit être coupée.
        return null;
      }

      token.role = dbUser.role;
      token.permissions = normalizePermissions(dbUser.permissions);
      return token;
    },
    session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.permissions = (token.permissions as string[] | undefined) ?? [];
      }
      return session;
    },
  },
});

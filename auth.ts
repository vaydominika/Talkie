import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { resolveRole } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: { signIn: "/sign-in" },
  providers: [
    Google,
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = z.object({ email: z.string().email(), password: z.string().min(8) }).safeParse(raw);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
        if (!user?.passwordHash || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: resolveRole(user.email, user.role),
        };
      },
    }),
  ],
  callbacks: {
    jwt: ({ token, user }) => {
      const email = user?.email ?? token.email;
      token.role = resolveRole(email, (user as { role?: string } | undefined)?.role ?? (token.role as string | undefined));
      return token;
    },
    session: ({ session, token }) => {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.role = resolveRole(session.user.email ?? token.email, token.role as string | undefined);
      }
      return session;
    },
  },
});

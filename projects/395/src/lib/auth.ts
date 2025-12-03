import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { type Adapter } from "next-auth/adapters";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      allowDangerousEmailAccountLinking: true,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID ?? "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 30,
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        // @ts-expect-error - image is optional on user
        token.picture = user.image ?? token.picture;
      }

      if (account) {
        token.provider = account.provider;
        token.providerAccountId = account.providerAccountId;
      }

      if (profile && "email_verified" in profile) {
        token.emailVerified =
          typeof profile.email_verified === "boolean"
            ? profile.email_verified
            : undefined;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = typeof token.id === "string" ? token.id : "";
        session.user.name = token.name ?? session.user.name ?? null;
        session.user.email = token.email ?? session.user.email ?? null;
        // @ts-expect-error - image is optional on user
        session.user.image = (token.picture as string | null | undefined) ?? session.user.image ?? null;
        (session.user as Record<string, unknown>).provider = token.provider;
        (session.user as Record<string, unknown>).providerAccountId =
          token.providerAccountId;
        (session.user as Record<string, unknown>).emailVerified =
          token.emailVerified ?? null;
      }

      return session;
    },
    async signIn({ user, account }) {
      if (!user?.email) return false;

      if (!account) return false;

      return true;
    },
  },
  events: {
    async signIn({ user, account, isNewUser }) {
      if (!user?.id || !account) return;

      try {
        await prisma.account.upsert({
          where: {
            provider_providerAccountId: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          },
          create: {
            userId: user.id,
            type: account.type,
            provider: account.provider,
            providerAccountId: account.providerAccountId,
            access_token: account.access_token,
            token_type: account.token_type,
            id_token: account.id_token,
            refresh_token: account.refresh_token,
            scope: account.scope,
            expires_at: account.expires_at,
            session_state: account.session_state,
          },
          update: {
            access_token: account.access_token,
            token_type: account.token_type,
            id_token: account.id_token,
            refresh_token: account.refresh_token,
            scope: account.scope,
            expires_at: account.expires_at,
            session_state: account.session_state,
          },
        });

        if (isNewUser) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              name: user.name,
              email: user.email,
              image: user.image,
            },
          });
        }
      } catch (error) {
        console.error("NextAuth signIn event error:", error);
      }
    },
  },
  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
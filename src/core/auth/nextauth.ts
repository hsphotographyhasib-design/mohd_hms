import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { db } from '@/core/database/db';
import { generateToken } from '@/core/auth/auth-lib';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          prompt: 'select_account',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Only handle Google provider
      if (account?.provider !== 'google') return false;

      const googleId = account.providerAccountId;
      const email = user.email;
      const name = user.name;
      const avatar = user.image;

      if (!email) return false;

      try {
        // Find existing user by googleId
        let existingUser = await db.user.findUnique({
          where: { googleId },
        });

        if (!existingUser) {
          // Find by email within default tenant
          existingUser = await db.user.findFirst({
            where: {
              email,
              tenant: { domain: 'default.mohdhms.com' },
            },
          });
        }

        if (!existingUser) {
          // Find or create default tenant
          let tenant = await db.tenant.findFirst({
            where: { domain: 'default.mohdhms.com' },
          });
          if (!tenant) {
            tenant = await db.tenant.create({
              data: {
                name: 'Default Organization',
                domain: 'default.mohdhms.com',
                plan: 'professional',
                maxUsers: 50,
              },
            });
          }

          // Create new user with "customer" role
          existingUser = await db.user.create({
            data: {
              tenantId: tenant.id,
              email,
              name: name || email.split('@')[0],
              avatar,
              googleId,
              role: 'customer',
              profileCompleted: false,
            },
            include: { tenant: { select: { id: true, name: true, domain: true } } },
          });
        } else {
          // Update googleId if not set, update avatar, update last login
          await db.user.update({
            where: { id: existingUser.id },
            data: {
              googleId: existingUser.googleId || googleId,
              avatar: avatar || existingUser.avatar,
              lastLogin: new Date().toISOString(),
              isOnline: true,
            },
          });
        }

        return true;
      } catch (error) {
        console.error('Google sign-in error:', error);
        return false;
      }
    },
    async jwt({ token, account, user }) {
      // Initial sign in: fetch user from DB and embed our custom data
      if (account?.provider === 'google' && user?.email) {
        const dbUser = await db.user.findFirst({
          where: {
            email: user.email,
            tenant: { domain: 'default.mohdhms.com' },
          },
          include: { tenant: { select: { id: true, name: true, domain: true } } },
        });

        if (dbUser) {
          token.customToken = generateToken({
            userId: dbUser.id,
            tenantId: dbUser.tenantId,
            role: dbUser.role,
            email: dbUser.email,
          });
          token.userId = dbUser.id;
          token.role = dbUser.role;
          token.tenantId = dbUser.tenantId;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).customToken = token.customToken;
        (session.user as any).userId = token.userId;
        (session.user as any).role = token.role;
        (session.user as any).tenantId = token.tenantId;
      }
      return session;
    },
  },
  pages: {
    signIn: '/',  // Redirect to our login page
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET || 'mohd-hms-nextauth-secret-key-2024',
};
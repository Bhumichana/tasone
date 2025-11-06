import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import * as bcrypt from 'bcryptjs'
import { prisma } from './db'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        console.log('🔐 Authorization attempt with credentials:', {
          username: credentials?.username,
          hasPassword: !!credentials?.password
        });

        if (!credentials?.username || !credentials?.password) {
          console.log('❌ Missing credentials');
          return null
        }

        try {
          const user = await prisma.user.findUnique({
            where: {
              username: credentials.username
            },
            include: {
              dealer: true
            }
          })

          console.log('👤 User lookup result:', {
            found: !!user,
            username: user?.username,
            userGroup: user?.userGroup,
            hasPassword: !!user?.password
          });

          if (!user) {
            console.log('❌ User not found');
            return null
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          )

          console.log('🔑 Password validation:', isPasswordValid);

          if (!isPasswordValid) {
            console.log('❌ Invalid password');
            return null
          }

          // เช็คว่า user ถูกอนุมัติแล้วหรือยัง
          if (!user.isActive) {
            console.log('❌ User not activated - waiting for admin approval');
            return null; // Return null เพื่อให้ NextAuth ส่ง error กลับไป
          }

          const authResult = {
            id: user.id,
            username: user.username,
            userGroup: user.userGroup,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
            phoneNumber: user.phoneNumber,
            dealerId: user.dealerId ?? undefined,
            dealerName: user.dealer?.dealerName || null,
            avatarUrl: user.profileImage || null,
          };

          console.log('✅ Authorization successful:', {
            id: authResult.id,
            username: authResult.username,
            userGroup: authResult.userGroup,
            role: authResult.role
          });

          return authResult;
        } catch (error) {
          console.error('🚨 Authorization error:', error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  callbacks: {
    async jwt({ token, user }) {
      // Initial sign in - user object is available
      if (user && 'userGroup' in user) {
        token.userGroup = user.userGroup
        token.role = user.role
        token.firstName = user.firstName
        token.lastName = user.lastName
        token.phoneNumber = user.phoneNumber
        token.dealerId = user.dealerId
        token.dealerName = user.dealerName
        token.username = user.username
        token.avatarUrl = user.avatarUrl
      }

      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.username = token.username as string
        session.user.userGroup = token.userGroup as string
        session.user.role = token.role as string
        session.user.firstName = token.firstName as string
        session.user.lastName = token.lastName as string
        session.user.phoneNumber = token.phoneNumber as string
        session.user.dealerId = token.dealerId as string | undefined
        session.user.dealerName = token.dealerName as string | null
        session.user.avatarUrl = token.avatarUrl as string | null
      }
      return session
    }
  },
  pages: {
    signIn: '/login',
    signOut: '/login'
  },
  secret: process.env.NEXTAUTH_SECRET,
}
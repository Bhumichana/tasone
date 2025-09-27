import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import * as bcrypt from 'bcryptjs'
import { prisma } from './prisma'

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
      if (user && 'userGroup' in user) {
        token.userGroup = user.userGroup
        token.role = user.role
        token.firstName = user.firstName
        token.lastName = user.lastName
        token.phoneNumber = user.phoneNumber
        token.dealerId = user.dealerId
        token.dealerName = user.dealerName
        token.username = user.username
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.username = token.username!
        session.user.userGroup = token.userGroup!
        session.user.role = token.role!
        session.user.firstName = token.firstName!
        session.user.lastName = token.lastName!
        session.user.phoneNumber = token.phoneNumber!
        session.user.dealerId = token.dealerId
        session.user.dealerName = token.dealerName
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
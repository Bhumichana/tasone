import { DefaultSession, DefaultUser } from 'next-auth'
import { JWT } from 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      username: string
      userGroup: string
      role: string
      firstName: string
      lastName: string
      phoneNumber: string
      dealerId?: string
      dealerName?: string
      avatarUrl?: string | null
    } & DefaultSession['user']
  }

  interface User extends DefaultUser {
    username: string
    userGroup: string
    role: string
    firstName: string
    lastName: string
    phoneNumber: string
    dealerId?: string
    dealerName?: string
    avatarUrl?: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    username: string
    userGroup: string
    role: string
    firstName: string
    lastName: string
    phoneNumber: string
    dealerId?: string
    dealerName?: string
    avatarUrl?: string | null
  }
}
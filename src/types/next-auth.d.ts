export interface User {
  id: string;
  email: string;
}

declare module 'next-auth' {
  interface Session {
    user: User;
  }

  interface User {
    id: string;
    email: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    email: string;
  }
}

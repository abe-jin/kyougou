import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import fs from "fs";
import path from "path";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async session({ session }) {
      try {
        const usersPath = path.join(process.cwd(), "users.json");
        const users = JSON.parse(fs.readFileSync(usersPath, "utf-8"));
        const found = users.find((u) => u.email === session.user?.email);
        if (found) {
          session.user.role = found.role || "user";
        }
      } catch {
        if (session.user) session.user.role = "user";
      }
      return session;
    },
  },
};

export default NextAuth(authOptions);
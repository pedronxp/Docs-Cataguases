import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@prisma/client', '.prisma/client'],
  // CORS agora é gerenciado pelo middleware.ts para evitar conflitos
};

export default nextConfig;

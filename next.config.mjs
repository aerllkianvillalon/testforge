/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdf-parse is CommonJS and touches the filesystem at require time; keep it
  // out of the server bundler rather than patching around the bundle error.
  serverExternalPackages: ['pdf-parse'],
};
export default nextConfig;

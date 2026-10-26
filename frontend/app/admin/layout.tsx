import { AdminLayout } from '@/components/admin-layout';

export default function AdminRootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AdminLayout>{children}</AdminLayout>;
}

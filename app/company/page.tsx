import { CompanyPage } from '@/components/information-pages';
import { getDb } from '@/lib/db';
export const metadata = { title: 'Our company' };
export default async function Page() {
  const content = process.env.DATABASE_URL
    ? await getDb().siteSetting.findUnique({ where: { key: 'company' } })
    : null;
  return <CompanyPage override={content?.value as { title?: string; body?: string } | undefined} />;
}

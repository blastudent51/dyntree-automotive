import { getCatalog } from '@/lib/catalog';
import { LegalPage } from '@/components/information-pages';
export const metadata = { title: 'Privacy' };
export default async function Page() {
  return <LegalPage kind="privacy" settings={(await getCatalog()).settings} />;
}

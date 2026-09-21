import { getCatalog } from '@/lib/catalog';
import { LegalPage } from '@/components/information-pages';
export const metadata = { title: 'Terms' };
export default async function Page() {
  return <LegalPage kind="terms" settings={(await getCatalog()).settings} />;
}

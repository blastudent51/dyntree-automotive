import { getCatalog } from '@/lib/catalog';
import { LegalPage } from '@/components/information-pages';
export const metadata = { title: 'Reservation Agreement' };
export default async function Page() {
  return <LegalPage kind="reservation-agreement" settings={(await getCatalog()).settings} />;
}

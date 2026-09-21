import { getCatalog } from '@/lib/catalog';
import { ChargingPage } from '@/components/information-pages';
export const metadata = { title: 'Charging' };
export default async function Page() {
  return <ChargingPage catalog={await getCatalog()} />;
}

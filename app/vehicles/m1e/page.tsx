import { getCatalog } from '@/lib/catalog';
import { VehiclePage } from '@/components/marketing';
export const metadata = { title: 'Meet the Dyntree M1E' };
export default async function Page() {
  return <VehiclePage catalog={await getCatalog()} />;
}

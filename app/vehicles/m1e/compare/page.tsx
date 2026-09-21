import { getCatalog } from '@/lib/catalog';
import { ComparePage } from '@/components/marketing';
export const metadata = { title: 'Compare M1E trims' };
export default async function Page() {
  return <ComparePage catalog={await getCatalog()} />;
}

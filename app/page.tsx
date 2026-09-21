import { HomePage } from '@/components/marketing';
import { getCatalog } from '@/lib/catalog';
export default async function Home() {
  return <HomePage catalog={await getCatalog()} />;
}

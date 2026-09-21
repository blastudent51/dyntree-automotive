import { getCatalog } from '@/lib/catalog';
import { GalleryPage } from '@/components/support-gallery';
export const metadata = { title: 'M1E prototype gallery' };
export default async function Page() {
  return <GalleryPage catalog={await getCatalog()} />;
}

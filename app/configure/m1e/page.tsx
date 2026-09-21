import { getCatalog } from '@/lib/catalog';
import { Configurator } from '@/components/configurator';
import { configurationFromQuery } from '@/lib/configuration';
export const metadata = { title: 'Configure your M1E' };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const catalog = await getCatalog();
  const params = await searchParams;
  const query = new URLSearchParams(
    Object.entries(params).flatMap(([k, v]) => (typeof v === 'string' ? [[k, v]] : [])),
  );
  return <Configurator catalog={catalog} initial={configurationFromQuery(catalog, query)} />;
}

import { CategoryClient } from '@/app/category/[id]/category-client'

export const dynamic = 'force-dynamic'

type CategoryPageProps = {
  params: Promise<{ id: string }>
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { id } = await params

  return <CategoryClient categoryId={id} />
}

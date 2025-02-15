import dynamic from 'next/dynamic'

const AlgebraGame = dynamic(() => import('@/components/algebra-game'), {
  ssr: false,
})

export default function Home() {
  return (
    <main className="min-h-screen">
      <AlgebraGame />
    </main>
  )
}
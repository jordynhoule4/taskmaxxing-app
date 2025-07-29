import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Taskmaxxing - Level Up Your Productivity',
  description: 'Turn productivity into a game with habit tracking and weekly planning',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

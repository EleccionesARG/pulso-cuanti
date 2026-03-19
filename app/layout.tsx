import './globals.css'

export const metadata = {
  title: 'Panel Pulso Cuanti',
  description: 'Motor de predicción de opinión pública argentina',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}

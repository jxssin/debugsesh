import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { DiscIcon as Discord, Twitter } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b py-4 px-6">
        <div className="container mx-auto flex justify-between items-center">
          <div className="w-24">{/* Empty div for spacing */}</div>

          <Link href="/" className="no-underline">
            <h1 className="text-2xl font-bold">MORTALITY.APP</h1>
          </Link>

          <div className="flex items-center space-x-4">
            <Link
              href="https://discord.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Discord"
            >
              <Discord size={20} />
            </Link>
            <Link
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Twitter"
            >
              <Twitter size={20} />
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <h1 className="text-6xl md:text-8xl font-bold mb-12">Welcome</h1>
        <Link href="/login">
          <Button
            size="lg"
            className="text-lg px-8 py-6 bg-black text-white hover:bg-black transition-transform duration-200 hover:scale-105 hover:shadow-lg"
          >
            Enter
          </Button>
        </Link>
      </main>
    </div>
  )
}


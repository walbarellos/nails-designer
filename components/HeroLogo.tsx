'use client'
import Image from 'next/image'

/**
 * components/HeroLogo.tsx
 * Logo pequeno, neutro e sem blend. Mostra um “selo” limpo.
 * Se tiver versão transparente, use /icons/logo.webp. Se não, mantém Banner.jpg.
 */
export default function HeroLogo() {
  return (
    <div
    className="
    flex-shrink-0
    size-14 sm:size-16
    rounded-full border border-white/15
    bg-white/3 backdrop-blur
    grid place-items-center
    overflow-hidden
    "
    aria-label="Marca"
    >
    <Image
    src="/icons/Banner.jpg"           // troque para /icons/logo.webp se tiver fundo transparente
    alt="Vânia Maria — Nail Designer"
    width={128}
    height={128}
    priority
    className="w-10 sm:w-12 h-auto select-none pointer-events-none"
    />
    </div>
  )
}

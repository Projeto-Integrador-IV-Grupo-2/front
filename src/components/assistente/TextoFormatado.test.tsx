import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TextoFormatado } from './TextoFormatado.tsx'

describe('TextoFormatado', () => {
  it('mostra listas, negrito e itálico aninhado sem HTML cru', () => {
    const { container } = render(
      <TextoFormatado
        texto={
          'Riscos:\n\n* **R03 – Escopo (*scope creep*)** (Nível 20)\n1. Primeiro\n2. Segundo\n\n<script>x</script>'
        }
      />,
    )
    expect(container.querySelectorAll('ul li')).toHaveLength(1)
    expect(container.querySelectorAll('ol li')).toHaveLength(2)
    expect(container.querySelector('strong em')).toHaveTextContent(
      'scope creep',
    )
    expect(container.querySelector('script')).toBeNull()
    expect(screen.getByText('<script>x</script>')).toBeInTheDocument()
  })
})

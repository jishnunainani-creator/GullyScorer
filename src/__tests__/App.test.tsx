// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import 'fake-indexeddb/auto'
import App from '../App'

describe('App Root Component', () => {
  it('renders without crashing', async () => {
    const { container } = render(<App />)
    expect(container).toBeDefined()
    expect(await screen.findByText('PITCHLOG')).toBeDefined()
  })
})

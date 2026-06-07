import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import type { Finding } from '../types'

interface Props { findings: Finding[]; target: string }

interface Node { id: string; type: string; group: number }
interface Link { source: string; target: string }

const typeGroup: Record<string, number> = {
  root: 0, subdomain: 1, ip: 2, port: 3, email: 4, technology: 5, waf: 6, cve: 7
}
const typeColor: Record<number, string> = {
  0: '#39d353', 1: '#58d9f9', 2: '#e3b341', 3: '#f0883e',
  4: '#bc8cff', 5: '#79c0ff', 6: '#f85149', 7: '#ff7b72'
}

export default function ForceGraph({ findings, target }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || !target) return
    const el = svgRef.current
    const { width, height } = el.getBoundingClientRect()

    d3.select(el).selectAll('*').remove()

    const nodes: Node[] = [{ id: target, type: 'root', group: 0 }]
    const links: Link[] = []
    const seen = new Set<string>([target])

    findings.forEach(f => {
      const id = `${f.type}:${f.value}`
      if (!seen.has(id)) {
        seen.add(id)
        nodes.push({ id, type: f.type, group: typeGroup[f.type] ?? 1 })
        if (f.type === 'subdomain') links.push({ source: target, target: id })
        else if (f.type === 'ip') {
          const parent = findings.find(ff => ff.type === 'subdomain' && ff.discovered_by === f.discovered_by)
          links.push({ source: parent ? `subdomain:${parent.value}` : target, target: id })
        } else if (f.type === 'port') {
          const ipFinding = findings.find(ff => ff.type === 'ip')
          links.push({ source: ipFinding ? `ip:${ipFinding.value}` : target, target: id })
        } else {
          links.push({ source: target, target: id })
        }
      }
    })

    const svg = d3.select(el)
      .attr('width', width).attr('height', height)

    svg.append('defs').append('filter').attr('id', 'glow')
      .append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur')

    const sim = d3.forceSimulation<Node>(nodes)
      .force('link', d3.forceLink<Node, Link>(links).id(d => d.id).distance(80).strength(0.5))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(30))

    const g = svg.append('g')

    svg.call(d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => g.attr('transform', event.transform)))

    const link = g.append('g').selectAll('line').data(links).join('line')
      .attr('stroke', 'var(--border2)').attr('stroke-width', 1).attr('stroke-opacity', 0.6)

    const node = g.append('g').selectAll('g').data(nodes).join('g')
      .attr('cursor', 'pointer')
      .call(d3.drag<SVGGElement, Node>()
        .on('start', (event, d) => { if (!event.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
        .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y })
        .on('end', (event, d) => { if (!event.active) sim.alphaTarget(0); d.fx = null; d.fy = null })
      )

    node.append('circle')
      .attr('r', d => d.group === 0 ? 14 : 8)
      .attr('fill', d => typeColor[d.group] ?? '#58d9f9')
      .attr('fill-opacity', 0.2)
      .attr('stroke', d => typeColor[d.group] ?? '#58d9f9')
      .attr('stroke-width', d => d.group === 0 ? 2 : 1.5)
      .attr('filter', 'url(#glow)')

    node.append('text')
      .attr('dy', d => d.group === 0 ? -18 : -12)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'Share Tech Mono, monospace')
      .attr('font-size', d => d.group === 0 ? 12 : 9)
      .attr('fill', d => typeColor[d.group] ?? '#c9d1d9')
      .text(d => d.group === 0 ? d.id : d.id.split(':')[1]?.slice(0, 20) ?? d.id)

    sim.on('tick', () => {
      link
        .attr('x1', d => (d.source as any).x).attr('y1', d => (d.source as any).y)
        .attr('x2', d => (d.target as any).x).attr('y2', d => (d.target as any).y)
      node.attr('transform', d => `translate(${d.x},${d.y})`)
    })

    return () => { sim.stop() }
  }, [findings, target])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: 'var(--bg)' }}>
      {findings.length === 0 && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-dim)', gap: 12,
        }}>
          <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
            <circle cx="30" cy="30" r="28" stroke="var(--border2)" strokeWidth="1" strokeDasharray="4 3" />
            <circle cx="30" cy="30" r="16" stroke="var(--border)" strokeWidth="1" />
            <circle cx="30" cy="30" r="4" fill="var(--border2)" />
          </svg>
          AWAITING RECON DATA
        </div>
      )}
      <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}

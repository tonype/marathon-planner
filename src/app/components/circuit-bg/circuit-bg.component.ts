import { Component, ElementRef, viewChild, afterNextRender, OnDestroy } from '@angular/core';

interface Node {
  x: number;
  y: number;
  connections: number[];
}

interface Electron {
  fromNode: number;
  toNode: number;
  progress: number;
  speed: number;
  color: string;
}

@Component({
  selector: 'app-circuit-bg',
  standalone: true,
  template: `<canvas #canvas class="fixed inset-0 w-full h-full pointer-events-none" style="z-index: 0"></canvas>`,
})
export class CircuitBgComponent implements OnDestroy {
  private canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private animId = 0;
  private nodes: Node[] = [];
  private electrons: Electron[] = [];
  private resizeObserver: ResizeObserver | null = null;

  private readonly COLORS = [
    'rgba(1, 215, 55, 0.7)',    // cyac green
    'rgba(254, 18, 93, 0.6)',   // nucal pink
    'rgba(255, 115, 0, 0.6)',   // traxus orange
    'rgba(191, 114, 228, 0.6)', // mida purple
    'rgba(207, 183, 47, 0.6)',  // sekgen yellow
  ];

  constructor() {
    afterNextRender(() => this.init());
  }

  private init() {
    const canvas = this.canvasRef().nativeElement;
    const ctx = canvas.getContext('2d')!;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.generateCircuit(canvas.width, canvas.height);
    };

    this.resizeObserver = new ResizeObserver(() => resize());
    this.resizeObserver.observe(document.body);
    resize();

    const animate = () => {
      this.draw(ctx, canvas.width, canvas.height);
      this.animId = requestAnimationFrame(animate);
    };
    this.animId = requestAnimationFrame(animate);
  }

  private generateCircuit(w: number, h: number) {
    this.nodes = [];
    this.electrons = [];

    // Create a grid of nodes with slight randomness
    const spacing = 80;
    const cols = Math.ceil(w / spacing) + 1;
    const rows = Math.ceil(h / spacing) + 1;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        this.nodes.push({
          x: c * spacing + (Math.random() - 0.5) * 30,
          y: r * spacing + (Math.random() - 0.5) * 30,
          connections: [],
        });
      }
    }

    // Connect nodes — only horizontal and vertical, with some randomness
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        // Right neighbor
        if (c < cols - 1 && Math.random() < 0.4) {
          const j = r * cols + c + 1;
          this.nodes[i].connections.push(j);
          this.nodes[j].connections.push(i);
        }
        // Bottom neighbor
        if (r < rows - 1 && Math.random() < 0.4) {
          const j = (r + 1) * cols + c;
          this.nodes[i].connections.push(j);
          this.nodes[j].connections.push(i);
        }
      }
    }

    // Seed initial electrons
    for (let i = 0; i < 35; i++) {
      this.spawnElectron();
    }
  }

  private spawnElectron() {
    // Find a node with connections
    const candidates = this.nodes
      .map((n, i) => ({ n, i }))
      .filter(({ n }) => n.connections.length > 0);
    if (candidates.length === 0) return;

    const { n, i } = candidates[Math.floor(Math.random() * candidates.length)];
    const toIdx = n.connections[Math.floor(Math.random() * n.connections.length)];

    this.electrons.push({
      fromNode: i,
      toNode: toIdx,
      progress: 0,
      speed: 0.003 + Math.random() * 0.006,
      color: this.COLORS[Math.floor(Math.random() * this.COLORS.length)],
    });
  }

  private draw(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.clearRect(0, 0, w, h);

    // Draw traces (circuit lines)
    const drawn = new Set<string>();
    ctx.lineWidth = 1;
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      for (const j of node.connections) {
        const key = Math.min(i, j) + ':' + Math.max(i, j);
        if (drawn.has(key)) continue;
        drawn.add(key);

        const other = this.nodes[j];
        ctx.strokeStyle = 'rgba(55, 55, 55, 0.8)';
        ctx.beginPath();
        ctx.moveTo(node.x, node.y);
        ctx.lineTo(other.x, other.y);
        ctx.stroke();
      }
    }

    // Draw small junction dots
    for (const node of this.nodes) {
      if (node.connections.length > 0) {
        ctx.fillStyle = 'rgba(70, 70, 70, 0.7)';
        ctx.beginPath();
        ctx.arc(node.x, node.y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Update and draw electrons
    for (let i = this.electrons.length - 1; i >= 0; i--) {
      const e = this.electrons[i];
      e.progress += e.speed;

      if (e.progress >= 1) {
        // Move to next segment
        const currentNode = this.nodes[e.toNode];
        if (currentNode.connections.length > 0 && Math.random() < 0.85) {
          const nextIdx = currentNode.connections[
            Math.floor(Math.random() * currentNode.connections.length)
          ];
          e.fromNode = e.toNode;
          e.toNode = nextIdx;
          e.progress = 0;
        } else {
          this.electrons.splice(i, 1);
          this.spawnElectron();
          continue;
        }
      }

      const from = this.nodes[e.fromNode];
      const to = this.nodes[e.toNode];
      const x = from.x + (to.x - from.x) * e.progress;
      const y = from.y + (to.y - from.y) * e.progress;

      // Outer glow
      const gradient2 = ctx.createRadialGradient(x, y, 0, x, y, 20);
      gradient2.addColorStop(0, e.color.replace(/[\d.]+\)$/, '0.3)'));
      gradient2.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient2;
      ctx.beginPath();
      ctx.arc(x, y, 20, 0, Math.PI * 2);
      ctx.fill();

      // Inner glow
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, 10);
      gradient.addColorStop(0, e.color);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.fill();

      // Core dot
      ctx.fillStyle = e.color.replace(/[\d.]+\)$/, '1)');
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Keep electron count stable
    while (this.electrons.length < 35) {
      this.spawnElectron();
    }
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.animId);
    this.resizeObserver?.disconnect();
  }
}

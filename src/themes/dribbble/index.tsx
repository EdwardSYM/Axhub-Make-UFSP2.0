import './globals.css';
import React, { useState } from 'react';
import { ThemeShell, NavGroup, NavItem } from '../../common/ThemeShell';

/**
 * Dribbble 风格主题演示页
 * 
 * 设计特点：
 * - 柔和的阴影 (Soft Shadows)
 * - 大圆角 (Large Radius)
 * - 鲜艳的强调色 (Vibrant Accents)
 * - 卡片式布局 (Card-based Layout)
 * - 创意与趣味性 (Creative & Playful)
 */

const groups: NavGroup[] = [
  { id: 'foundation', title: '基础', order: 1 },
  { id: 'components', title: '组件', order: 2 },
  { id: 'showcase', title: '展示', order: 3 },
];

const items: NavItem[] = [
  { id: 'colors', label: '色彩 Colors', groupId: 'foundation' },
  { id: 'typography', label: '字体 Typography', groupId: 'foundation' },
  { id: 'shadows', label: '阴影 Shadows', groupId: 'foundation' },
  { id: 'radius', label: '圆角 Radius', groupId: 'foundation' },

  { id: 'buttons', label: '按钮 Buttons', groupId: 'components' },
  { id: 'cards', label: '卡片 Cards', groupId: 'components' },
  { id: 'inputs', label: '输入框 Inputs', groupId: 'components' },

  { id: 'gallery', label: '画廊 Gallery', groupId: 'showcase' },
];

function ColorSwatch({ name, color, hex, light = false }: { name: string; color: string; hex: string; light?: boolean }) {
  return (
    <div className="flex flex-col items-center group cursor-pointer">
      <div 
        className={`w-20 h-20 rounded-2xl mb-3 flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-md ${light ? 'border border-border' : ''}`}
        style={{ backgroundColor: color }}
      >
      </div>
      <div className="text-sm font-medium mb-1">{name}</div>
      <div className="text-xs text-muted-foreground font-mono opacity-0 group-hover:opacity-100 transition-opacity">{hex}</div>
    </div>
  );
}

function ColorsSection() {
  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <div>
        <h2 className="text-3xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-500 w-fit">品牌色 Brand</h2>
        <div className="flex gap-8 flex-wrap">
          <ColorSwatch name="Primary" color="var(--primary)" hex="#EA4C89" />
          <ColorSwatch name="Foreground" color="var(--primary-foreground)" hex="#FFFFFF" light />
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-6 text-foreground/80">背景与表面 Surface</h2>
        <div className="flex gap-8 flex-wrap">
          <ColorSwatch name="Background" color="var(--background)" hex="#F8F7F4" light />
          <ColorSwatch name="Card" color="var(--card)" hex="#FFFFFF" light />
          <ColorSwatch name="Secondary" color="var(--secondary)" hex="#F3F3F4" light />
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-6 text-foreground/80">状态 Status</h2>
        <div className="flex gap-8 flex-wrap">
          <ColorSwatch name="Destructive" color="var(--destructive)" hex="#FF5555" />
          <ColorSwatch name="Success" color="#4ADE80" hex="#4ADE80" />
          <ColorSwatch name="Warning" color="#FACC15" hex="#FACC15" />
        </div>
      </div>
    </div>
  );
}

function TypographySection() {
  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold mb-8">字体排印 Typography</h2>
      
      <div className="grid gap-8">
        <div className="p-8 bg-card rounded-3xl shadow-md hover:shadow-lg transition-shadow duration-300 border border-border/50">
          <h1 className="text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-purple-600 w-fit">Creative Heading</h1>
          <p className="text-muted-foreground font-mono text-sm mb-6">H1 / 48px / Bold</p>
          <p className="text-lg leading-relaxed text-foreground/80 max-w-2xl">
            Design is not just what it looks like and feels like. Design is how it works. 
            设计不仅仅是外观和感觉，设计是关于它是如何工作的。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-6 bg-card rounded-2xl shadow-sm border border-border/50">
            <h2 className="text-2xl font-semibold mb-2">Section Title</h2>
            <p className="text-muted-foreground font-mono text-xs mb-4">H2 / 24px / Semibold</p>
            <p className="text-base text-foreground/70">
              这里是正文内容展示。Dribbble 风格通常使用较大的行高和舒适的字间距，让阅读体验更加轻松愉悦。
            </p>
          </div>
          
          <div className="p-6 bg-card rounded-2xl shadow-sm border border-border/50">
            <h3 className="text-lg font-medium mb-2 text-primary">Accent Text</h3>
            <p className="text-muted-foreground font-mono text-xs mb-4">H3 / 18px / Medium</p>
            <p className="text-sm text-foreground/60">
              辅助文字通常使用较浅的颜色，但保持足够的对比度以确保可读性。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShadowsSection() {
  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold mb-8">阴影与深度 Shadows & Depth</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 py-8">
        <div className="bg-card p-8 rounded-2xl shadow-sm flex flex-col items-center justify-center aspect-square transition-transform hover:-translate-y-1 duration-300">
          <span className="font-medium text-lg mb-2">Small</span>
          <span className="text-muted-foreground text-sm font-mono">shadow-sm</span>
        </div>
        
        <div className="bg-card p-8 rounded-2xl shadow-md flex flex-col items-center justify-center aspect-square transition-transform hover:-translate-y-1 duration-300">
          <span className="font-medium text-lg mb-2">Medium</span>
          <span className="text-muted-foreground text-sm font-mono">shadow-md</span>
        </div>
        
        <div className="bg-card p-8 rounded-2xl shadow-lg flex flex-col items-center justify-center aspect-square transition-transform hover:-translate-y-1 duration-300">
          <span className="font-medium text-lg mb-2">Large</span>
          <span className="text-muted-foreground text-sm font-mono">shadow-lg</span>
        </div>
      </div>
    </div>
  );
}

function RadiusSection() {
  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold mb-8">圆角 Radius</h2>
      
      <div className="flex flex-wrap gap-8 items-end">
        {[
          { name: 'sm', val: 'rounded-sm', px: '8px' },
          { name: 'md', val: 'rounded-md', px: '12px' },
          { name: 'lg', val: 'rounded-lg', px: '16px' },
          { name: 'xl', val: 'rounded-xl', px: '24px' },
          { name: '2xl', val: 'rounded-2xl', px: '32px' },
          { name: 'full', val: 'rounded-full', px: '999px' },
        ].map(({ name, val, px }) => (
          <div key={name} className="flex flex-col items-center gap-3">
            <div className={`w-24 h-24 bg-gradient-to-br from-pink-400 to-orange-400 ${val} shadow-md`}></div>
            <div className="text-center">
              <div className="font-medium">{name}</div>
              <div className="text-xs text-muted-foreground font-mono">{px}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ButtonsSection() {
  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold mb-8">按钮 Buttons</h2>
      
      <div className="p-12 bg-card rounded-3xl shadow-md border border-border/50 space-y-8">
        <div className="flex flex-wrap gap-6 items-center">
          <button className="px-6 py-3 bg-primary text-white rounded-xl font-medium shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200">
            Primary Action
          </button>
          
          <button className="px-6 py-3 bg-secondary text-secondary-foreground rounded-xl font-medium hover:bg-secondary/80 transition-colors">
            Secondary
          </button>
          
          <button className="px-6 py-3 border-2 border-border text-foreground rounded-xl font-medium hover:border-primary/50 hover:text-primary transition-colors">
            Outline
          </button>
          
          <button className="px-6 py-3 text-primary font-medium hover:underline decoration-2 underline-offset-4">
            Ghost Link
          </button>
        </div>
        
        <div className="flex flex-wrap gap-6 items-center">
          <button className="w-12 h-12 flex items-center justify-center bg-primary text-white rounded-full shadow-md hover:shadow-lg hover:scale-110 transition-all">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
          
          <button className="w-12 h-12 flex items-center justify-center bg-secondary text-secondary-foreground rounded-full hover:bg-secondary/80 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </button>

          <button className="px-8 py-4 bg-gradient-to-r from-pink-500 to-violet-600 text-white rounded-full font-bold shadow-lg hover:shadow-pink-500/25 hover:scale-105 transition-all">
            Gradient Button
          </button>
        </div>
      </div>
    </div>
  );
}

function CardsSection() {
  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold mb-8">卡片 Cards</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Simple Card */}
        <div className="bg-card p-6 rounded-2xl shadow-sm border border-border/50 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-pink-100 text-pink-500 rounded-xl flex items-center justify-center mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          </div>
          <h3 className="text-xl font-bold mb-2">Project Title</h3>
          <p className="text-muted-foreground mb-4">Minimalist card with icon and text. Perfect for features list.</p>
          <a href="#" className="text-primary font-medium hover:underline">Learn more →</a>
        </div>

        {/* Image Card */}
        <div className="bg-card rounded-3xl shadow-md overflow-hidden group hover:shadow-xl transition-all duration-300">
          <div className="h-48 bg-gradient-to-br from-violet-400 to-fuchsia-300 relative overflow-hidden">
             <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
          </div>
          <div className="p-6">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-xl font-bold">Creative Work</h3>
              <span className="px-2 py-1 bg-secondary rounded-md text-xs font-mono">NEW</span>
            </div>
            <p className="text-muted-foreground text-sm mb-4">A showcase of beautiful design work with vibrant colors.</p>
            <div className="flex items-center gap-2 text-sm text-foreground/60">
              <div className="w-6 h-6 rounded-full bg-gray-200"></div>
              <span>Designer Name</span>
            </div>
          </div>
        </div>

        {/* Interactive Card */}
        <div className="bg-gradient-to-br from-pink-500 to-rose-500 rounded-3xl p-1 shadow-lg text-white transform hover:-rotate-1 transition-transform cursor-pointer">
          <div className="bg-white/10 backdrop-blur-sm h-full w-full rounded-[20px] p-6 flex flex-col justify-between min-h-[200px] border border-white/20">
            <div>
              <h3 className="text-2xl font-bold mb-2">Pro Plan</h3>
              <p className="text-white/80">Unlock all features</p>
            </div>
            <button className="w-full py-3 bg-white text-pink-600 rounded-xl font-bold hover:bg-white/90 transition-colors shadow-lg">
              Upgrade Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InputsSection() {
  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold mb-8">输入框 Inputs</h2>
      
      <div className="max-w-md space-y-6 p-8 bg-card rounded-3xl shadow-sm border border-border/50">
        <div className="space-y-2">
          <label className="text-sm font-medium ml-1">Email Address</label>
          <input 
            type="email" 
            placeholder="hello@example.com" 
            className="w-full px-4 py-3 bg-secondary rounded-xl border-2 border-transparent focus:border-primary/30 focus:bg-white focus:outline-none transition-all placeholder:text-muted-foreground/50"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium ml-1">Password</label>
          <input 
            type="password" 
            placeholder="••••••••" 
            className="w-full px-4 py-3 bg-secondary rounded-xl border-2 border-transparent focus:border-primary/30 focus:bg-white focus:outline-none transition-all placeholder:text-muted-foreground/50"
          />
        </div>

        <div className="flex items-center gap-3 p-4 bg-secondary/50 rounded-xl border border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors">
          <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-muted-foreground">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          </div>
          <div>
            <div className="text-sm font-medium">Upload File</div>
            <div className="text-xs text-muted-foreground">Drag & drop or click to upload</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GallerySection() {
  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold mb-8">画廊 Showcase</h2>
      
      <div className="masonry-grid grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="group relative rounded-2xl overflow-hidden mb-4 cursor-zoom-in">
            <div 
              className={`w-full bg-gray-200 aspect-[${i % 2 === 0 ? '3/4' : '4/3'}] transition-transform duration-500 group-hover:scale-105`}
              style={{
                backgroundColor: `hsl(${i * 45}, 70%, 90%)`,
                backgroundImage: `linear-gradient(to bottom right, hsl(${i * 45}, 70%, 90%), hsl(${i * 45 + 30}, 70%, 80%))`
              }}
            ></div>
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-end p-4 opacity-0 group-hover:opacity-100">
              <div className="bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg text-xs font-medium shadow-sm translate-y-2 group-hover:translate-y-0 transition-transform">
                Artwork #{i}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function renderContent(activeId: string) {
  switch (activeId) {
    case 'colors': return <ColorsSection />;
    case 'typography': return <TypographySection />;
    case 'shadows': return <ShadowsSection />;
    case 'radius': return <RadiusSection />;
    case 'buttons': return <ButtonsSection />;
    case 'cards': return <CardsSection />;
    case 'inputs': return <InputsSection />;
    case 'gallery': return <GallerySection />;
    default: return <ColorsSection />;
  }
}

const Component = function () {
  const [activeId, setActiveId] = useState('colors');

  return (
    <ThemeShell
      brand={{
        name: 'Dribbble',
        subtitle: 'Inspiration',
        logoBgColor: '#ea4c89',
        logoTextColor: '#ffffff',
      }}
      groups={groups}
      items={items}
      activeId={activeId}
      onNavigate={setActiveId}
      className="dribbble-theme"
    >
      <div className="max-w-6xl mx-auto py-8">
        {renderContent(activeId)}
      </div>
    </ThemeShell>
  );
};

export default Component;

import './globals.css';
import React, { useState } from 'react';
import { ThemeShell, NavGroup, NavItem } from '../../common/ThemeShell';

const groups: NavGroup[] = [
  { id: 'foundation', title: '基础', order: 1 },
  { id: 'components', title: '组件', order: 2 },
];

const items: NavItem[] = [
  { id: 'colors', label: '色彩系统', groupId: 'foundation' },
  { id: 'typography', label: '字体系统', groupId: 'foundation' },
  { id: 'spacing', label: '间距', groupId: 'foundation' },
  { id: 'radius', label: '圆角', groupId: 'foundation' },
  { id: 'shadows', label: '阴影', groupId: 'foundation' },
  { id: 'buttons', label: '按钮', groupId: 'components' },
];

function ColorSwatch({
  name,
  color,
  hex,
  textDark = false,
  light = false
}: {
  name: string;
  color: string;
  hex: string;
  textDark?: boolean;
  light?: boolean;
}) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: '80px',
        height: '80px',
        backgroundColor: color,
        borderRadius: '8px',
        marginBottom: '8px',
        border: light ? '1px solid var(--border)' : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {textDark && (
          <span style={{ fontSize: '12px', color: '#1e293b', fontWeight: 500 }}>Aa</span>
        )}
      </div>
      <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '2px' }}>{name}</div>
      <div style={{ fontSize: '11px', color: 'var(--subtle)', fontFamily: 'var(--font-mono)' }}>{hex}</div>
    </div>
  );
}

function ColorsSection() {
  return (
    <div>
      <h2 style={{ fontSize: '24px', fontWeight: 500, marginBottom: '24px' }}>色彩系统</h2>
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '12px', fontWeight: 500, color: 'var(--muted-foreground)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Primary
        </h3>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <ColorSwatch name="primary" color="var(--primary)" hex="#3EACEF" />
          <ColorSwatch name="primary-foreground" color="var(--primary-foreground)" hex="#FFFFFF" light />
        </div>
      </div>
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '12px', fontWeight: 500, color: 'var(--muted-foreground)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Background & Surface
        </h3>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <ColorSwatch name="background" color="var(--background)" hex="#F2F2F2" light />
          <ColorSwatch name="card" color="var(--card)" hex="#FFFFFF" light />
          <ColorSwatch name="popover" color="var(--popover)" hex="#FFFFFF" light />
          <ColorSwatch name="muted" color="var(--muted)" hex="rgba(0,0,0,0.04)" light />
        </div>
      </div>
      <div>
        <h3 style={{ fontSize: '12px', fontWeight: 500, color: 'var(--muted-foreground)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Text
        </h3>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <ColorSwatch name="foreground" color="var(--foreground)" hex="#1E293B" textDark />
          <ColorSwatch name="muted-foreground" color="var(--muted-foreground)" hex="rgba(30,41,59,0.6)" textDark />
          <ColorSwatch name="subtle" color="var(--subtle)" hex="rgba(30,41,59,0.48)" textDark />
        </div>
      </div>
    </div>
  );
}

function TypographySection() {
  return (
    <div>
      <h2 style={{ fontSize: '24px', fontWeight: 500, marginBottom: '24px' }}>字体系统</h2>
      <div style={{
        backgroundColor: 'var(--card)',
        borderRadius: '12px',
        padding: '24px',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ marginBottom: '20px' }}>
          <span style={{ fontSize: '12px', color: 'var(--subtle)', fontFamily: 'var(--font-mono)' }}>H1 / 24px / 600</span>
          <p style={{ fontSize: '24px', fontWeight: 600, lineHeight: 1.4 }}>UFSP Sky</p>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <span style={{ fontSize: '12px', color: 'var(--subtle)', fontFamily: 'var(--font-mono)' }}>Body / 14px / 400</span>
          <p style={{ fontSize: '14px', fontWeight: 400, lineHeight: 1.6 }}>The quick brown fox jumps over the lazy dog. 快速的棕色狐狸跳过了懒狗。</p>
        </div>
        <div>
          <span style={{ fontSize: '12px', color: 'var(--subtle)', fontFamily: 'var(--font-mono)' }}>Label / 12px / 500</span>
          <p style={{ fontSize: '12px', fontWeight: 500, lineHeight: 1.4, letterSpacing: '0.01em' }}>Label Text</p>
        </div>
      </div>
    </div>
  );
}

function SpacingSection() {
  const items = [
    { name: '--spacing-1', value: 'var(--spacing-1)' },
    { name: '--spacing-2', value: 'var(--spacing-2)' },
    { name: '--spacing-3', value: 'var(--spacing-3)' },
    { name: '--spacing-4', value: 'var(--spacing-4)' },
    { name: '--spacing-6', value: 'var(--spacing-6)' },
    { name: '--spacing-8', value: 'var(--spacing-8)' },
    { name: '--spacing-10', value: 'var(--spacing-10)' },
  ];
  return (
    <div>
      <h2 style={{ fontSize: '24px', fontWeight: 500, marginBottom: '24px' }}>间距</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {items.map(({ name, value }) => (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: value, height: '14px', backgroundColor: 'var(--primary)', borderRadius: '2px' }} />
            <span style={{ fontSize: '12px', color: 'var(--subtle)', fontFamily: 'var(--font-mono)' }}>
              {name}: {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RadiusSection() {
  const items = [
    { name: '--radius-sm', value: 'var(--radius-sm)' },
    { name: '--radius-md', value: 'var(--radius-md)' },
    { name: '--radius-lg', value: 'var(--radius-lg)' },
    { name: '--radius-xl', value: 'var(--radius-xl)' },
    { name: '--radius-2xl', value: 'var(--radius-2xl)' },
    { name: '--radius-full', value: 'var(--radius-full)' },
  ];
  return (
    <div>
      <h2 style={{ fontSize: '24px', fontWeight: 500, marginBottom: '24px' }}>圆角</h2>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        {items.map(({ name, value }) => (
          <div key={name} style={{ textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', backgroundColor: 'var(--primary)', borderRadius: value, marginBottom: '8px' }} />
            <div style={{ fontSize: '11px', color: 'var(--subtle)', fontFamily: 'var(--font-mono)' }}>{name}</div>
            <div style={{ fontSize: '12px', color: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ShadowsSection() {
  const items = [
    { name: '--shadow-sm', value: 'var(--shadow-sm)', desc: '轻量卡片、列表' },
    { name: '--shadow-md', value: 'var(--shadow-md)', desc: '浮层、弹窗' },
  ];
  return (
    <div>
      <h2 style={{ fontSize: '24px', fontWeight: 500, marginBottom: '24px' }}>阴影</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        {items.map(({ name, value, desc }) => (
          <div key={name} style={{
            backgroundColor: 'var(--card)',
            borderRadius: '10px',
            border: '1px solid var(--border)',
            padding: '18px',
            boxShadow: value
          }}>
            <div style={{ fontSize: '12px', color: 'var(--subtle)', fontFamily: 'var(--font-mono)', marginBottom: '8px' }}>{name}</div>
            <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>{desc}</div>
            <div style={{ fontSize: '12px', color: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ButtonsSection() {
  return (
    <div>
      <h2 style={{ fontSize: '24px', fontWeight: 500, marginBottom: '24px' }}>按钮</h2>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <button style={{
          backgroundColor: 'var(--primary)',
          color: 'var(--primary-foreground)',
          padding: '10px 20px',
          borderRadius: '6px',
          border: 'none',
          fontSize: '14px',
          fontWeight: 500,
          cursor: 'pointer',
          boxShadow: '0 2px 4px rgba(62, 172, 239, 0.18)'
        }}>
          Primary
        </button>
        <button style={{
          backgroundColor: 'var(--secondary)',
          color: 'var(--secondary-foreground)',
          padding: '10px 20px',
          borderRadius: '6px',
          border: '1px solid var(--border)',
          fontSize: '14px',
          fontWeight: 500,
          cursor: 'pointer'
        }}>
          Secondary
        </button>
        <button style={{
          backgroundColor: 'transparent',
          color: 'var(--foreground)',
          padding: '10px 20px',
          borderRadius: '6px',
          border: '1px solid var(--border)',
          fontSize: '14px',
          fontWeight: 500,
          cursor: 'pointer'
        }}>
          Ghost
        </button>
        <button style={{
          backgroundColor: 'var(--destructive)',
          color: 'var(--destructive-foreground)',
          padding: '10px 20px',
          borderRadius: '6px',
          border: 'none',
          fontSize: '14px',
          fontWeight: 500,
          cursor: 'pointer'
        }}>
          Danger
        </button>
      </div>
    </div>
  );
}

function renderContent(activeId: string) {
  switch (activeId) {
    case 'colors':
      return <ColorsSection />;
    case 'typography':
      return <TypographySection />;
    case 'spacing':
      return <SpacingSection />;
    case 'radius':
      return <RadiusSection />;
    case 'shadows':
      return <ShadowsSection />;
    case 'buttons':
      return <ButtonsSection />;
    default:
      return <ColorsSection />;
  }
}

function Component() {
  const [activeId, setActiveId] = useState('colors');
  return (
    <ThemeShell
      brand={{
        name: 'UFSP',
        subtitle: 'Sky Theme',
        logoBgColor: '#3eacef',
        logoTextColor: '#ffffff',
      }}
      groups={groups}
      items={items}
      activeId={activeId}
      onNavigate={setActiveId}
      sidebar={{
        width: 240,
        defaultOpen: true,
        collapsible: true,
      }}
      theme={{
        mode: 'light',
        colors: {
          bgPrimary: '#ffffff',
          bgSecondary: '#f2f2f2',
          bgTertiary: '#ffffff',
          bgHover: '#f5f5f5',
          bgActive: '#ededed',
          textPrimary: '#1e293b',
          textSecondary: 'rgba(30,41,59,0.72)',
          textTertiary: 'rgba(30,41,59,0.56)',
          textMuted: 'rgba(30,41,59,0.4)',
          border: '#e5e7eb',
          borderLight: '#f0f0f0',
          activeIndicator: '#3eacef',
        },
      }}
      style={{
        fontFamily: 'var(--font-sans)',
      }}
    >
      {renderContent(activeId)}
    </ThemeShell>
  );
}

export default Component;


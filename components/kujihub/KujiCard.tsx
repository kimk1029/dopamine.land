import type { ScheduleEntry } from '@/lib/kujihub/types/kuji';

interface KujiCardProps {
  entry: ScheduleEntry;
}

export function KujiCard({ entry }: KujiCardProps) {
  const isOnline = entry.type === 'online';
  const badgeText = isOnline ? 'ONLINE' : 'RETAIL';
  const title = entry.item.translatedTitle || entry.item.title;
  
  return (
    <div className="card kuji-card" style={{ padding: 0 }}>
      <div className="kuji-card-img" style={{ height: '140px', fontSize: '2.5rem' }}>
        {isOnline ? '🌐' : '🏪'}
      </div>
      <div className="kuji-card-body">
        <span style={{ 
          fontSize: '0.65rem', 
          fontWeight: 900, 
          padding: '2px 8px', 
          background: isOnline ? 'var(--primary-dark)' : '#d1d9e6',
          color: isOnline ? 'white' : 'var(--text-muted)',
          display: 'inline-block',
          marginBottom: '8px'
        }}>
          {badgeText}
        </span>
        <h4 className="kuji-card-title" style={{ fontSize: '1rem', height: '2.4em', overflow: 'hidden' }}>{title}</h4>
        <div className="kuji-card-footer">
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)' }}>DETAILS</span>
          <span style={{ fontSize: '0.8rem' }}>▶</span>
        </div>
      </div>
    </div>
  );
}

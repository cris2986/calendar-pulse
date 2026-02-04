interface LandingHeaderProps {
  debugMode: boolean;
  onToggleDebug: () => void;
  onOpenCalendar: () => void;
  onOpenDataManagement: () => void;
  onOpenSettings: () => void;
}

export function LandingHeader({
  debugMode,
  onToggleDebug,
  onOpenCalendar,
  onOpenDataManagement,
  onOpenSettings,
}: LandingHeaderProps) {
  return (
    <header className="ea-header">
      <div className="ea-header__left">
        <div className="ea-appmark" aria-hidden />
        <div>
          <div className="ea-title">Event Auditor</div>
          <div className="ea-subtitle">Auditor de compromisos no agendados</div>
        </div>
      </div>
      <div className="ea-header__right">
        <button
          className="ea-iconbtn"
          aria-label="Debug Mode"
          type="button"
          onClick={onToggleDebug}
          style={{
            background: debugMode ? "rgba(79, 140, 255, 0.2)" : "rgba(255, 255, 255, 0.02)",
            borderColor: debugMode ? "rgba(79, 140, 255, 0.35)" : "var(--line)",
          }}
        >
          🐛
        </button>
        <button className="ea-iconbtn" aria-label="Calendario" type="button" onClick={onOpenCalendar}>
          📅
        </button>
        <button className="ea-iconbtn" aria-label="Gestión de datos" type="button" onClick={onOpenDataManagement}>
          💾
        </button>
        <button className="ea-iconbtn" aria-label="Ajustes" type="button" onClick={onOpenSettings}>
          ⚙️
        </button>
      </div>
    </header>
  );
}

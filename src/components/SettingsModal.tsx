import { Settings } from "@/core/types";
import { toast } from "sonner";

interface SettingsModalProps {
  settings: Settings;
  onClose: () => void;
  onUpdateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => Promise<void>;
  isNative: boolean;
  notifPermissionGranted: boolean;
  notifListening: boolean;
  requestNotifPermission: () => Promise<boolean>;
  startNotifListening: () => Promise<boolean>;
  checkNotifPermission: () => Promise<boolean>;
}

export function SettingsModal({
  settings,
  onClose,
  onUpdateSetting,
  isNative,
  notifPermissionGranted,
  notifListening,
  requestNotifPermission,
  startNotifListening,
  checkNotifPermission,
}: SettingsModalProps) {
  return (
    <div className="ea-modal-backdrop" onClick={onClose}>
      <div className="ea-modal" onClick={e => e.stopPropagation()}>
        <div className="ea-modal__header">
          <div className="ea-modal__title">Configuración</div>
          <button className="ea-modal__close" onClick={onClose}>×</button>
        </div>
        <div className="ea-modal__content">
          <div className="ea-field">
            <span className="ea-label">Ventana de detección</span>
            <select 
              className="ea-select"
              value={settings.window_hours}
              onChange={(e) => onUpdateSetting('window_hours', Number(e.target.value) as 24 | 48)}
            >
              <option value={24}>24 horas</option>
              <option value={48}>48 horas</option>
            </select>
          </div>
          
          <div className="ea-field">
            <span className="ea-label">Retención de datos</span>
            <select 
              className="ea-select"
              value={settings.retention_days}
              onChange={(e) => onUpdateSetting('retention_days', Number(e.target.value) as 7 | 30 | 90)}
            >
              <option value={7}>7 días</option>
              <option value={30}>30 días</option>
              <option value={90}>90 días</option>
            </select>
          </div>

          <div className="ea-field">
            <span className="ea-label">Notificaciones</span>
            <div className="ea-row">
              <button
                className={`ea-btn ${settings.notifications_enabled ? 'ea-btn--primary' : 'ea-btn--ghost'}`}
                onClick={() => onUpdateSetting('notifications_enabled', true)}
              >
                Activadas
              </button>
              <button
                className={`ea-btn ${!settings.notifications_enabled ? 'ea-btn--primary' : 'ea-btn--ghost'}`}
                onClick={() => onUpdateSetting('notifications_enabled', false)}
              >
                Desactivadas
              </button>
            </div>
          </div>

          {isNative && (
            <div className="ea-field" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
              <span className="ea-label">📱 Lectura automática de WhatsApp</span>
              <div className="ea-card__hint" style={{ marginBottom: '8px' }}>
                Detecta automáticamente compromisos desde las notificaciones de WhatsApp
              </div>

              {!notifPermissionGranted ? (
                <button
                  className="ea-btn ea-btn--primary"
                  onClick={async () => {
                    await requestNotifPermission();
                    toast.info("Activa 'Calendar Pulse' en la lista de apps con acceso a notificaciones");
                  }}
                >
                  Activar acceso a notificaciones
                </button>
              ) : (
                <div className="ea-row ea-row--between">
                  <span style={{ color: 'var(--success)' }}>✓ Permiso concedido</span>
                  {notifListening ? (
                    <span className="ea-badge ea-badge--success">Escuchando</span>
                  ) : (
                    <button
                      className="ea-btn ea-btn--ghost"
                      onClick={startNotifListening}
                    >
                      Iniciar
                    </button>
                  )}
                </div>
              )}

              <button
                className="ea-btn ea-btn--ghost"
                style={{ marginTop: '8px' }}
                onClick={checkNotifPermission}
              >
                Verificar permiso
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

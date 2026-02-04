interface DataManagementModalProps {
  onClose: () => void;
  onExportData: () => Promise<void>;
  onImportData: (file: File) => Promise<void>;
  onResetAllData: () => Promise<void>;
}

export function DataManagementModal({
  onClose,
  onExportData,
  onImportData,
  onResetAllData,
}: DataManagementModalProps) {
  return (
    <div className="ea-modal-backdrop" onClick={onClose}>
      <div className="ea-modal" onClick={e => e.stopPropagation()}>
        <div className="ea-modal__header">
          <div className="ea-modal__title">Gestión de datos</div>
          <button className="ea-modal__close" onClick={onClose}>×</button>
        </div>
        <div className="ea-modal__content">
          <div className="ea-field">
            <span className="ea-label">Exportar datos</span>
            <div className="ea-card__hint" style={{ marginBottom: '8px' }}>
              Descarga una copia de seguridad de todos tus datos locales
            </div>
            <button className="ea-btn ea-btn--primary" onClick={onExportData}>
              📥 Exportar a JSON
            </button>
          </div>

          <div className="ea-field">
            <span className="ea-label">Importar datos</span>
            <div className="ea-card__hint" style={{ marginBottom: '8px' }}>
              Restaura datos desde un archivo de respaldo
            </div>
            <label className="ea-file">
              <input 
                className="ea-file__input" 
                type="file" 
                accept=".json,application/json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onImportData(file);
                }}
              />
              <span className="ea-btn ea-btn--primary">
                📤 Seleccionar archivo JSON
              </span>
            </label>
          </div>

          <div className="ea-field" style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--line)' }}>
            <span className="ea-label" style={{ color: 'var(--danger)' }}>Zona de peligro</span>
            <div className="ea-card__hint" style={{ marginBottom: '8px' }}>
              Elimina permanentemente todos los datos locales
            </div>
            <button 
              className="ea-btn ea-btn--ghost" 
              style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
              onClick={onResetAllData}
            >
              🗑️ Resetear todos los datos
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

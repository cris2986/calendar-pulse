interface CalendarImportCardProps {
  icsFile: File | null;
  loading: boolean;
  onPickFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImport: () => void;
}

export function CalendarImportCard({
  icsFile,
  loading,
  onPickFile,
  onImport,
}: CalendarImportCardProps) {
  return (
    <section className="ea-card">
      <div className="ea-card__head">
        <div className="ea-card__title">Calendario objetivo</div>
        <div className="ea-card__hint">Importa un archivo .ics para comparar.</div>
      </div>
      <div className="ea-row ea-row--between">
        <label className="ea-file">
          <input
            className="ea-file__input"
            type="file"
            accept=".ics,text/calendar"
            onChange={onPickFile}
            disabled={loading}
          />
          <span className="ea-btn ea-btn--ghost">
            {icsFile ? icsFile.name.slice(0, 20) : "Seleccionar archivo"}
          </span>
        </label>
        <button className="ea-btn ea-btn--primary" onClick={onImport} type="button" disabled={loading || !icsFile}>
          Importar ICS
        </button>
      </div>
    </section>
  );
}

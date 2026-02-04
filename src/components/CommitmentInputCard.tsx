interface CommitmentInputCardProps {
  inputText: string;
  loading: boolean;
  onInputChange: (value: string) => void;
  onProcess: () => void;
  onPaste: () => void;
  onPasteAndProcess: () => void;
}

export function CommitmentInputCard({
  inputText,
  loading,
  onInputChange,
  onProcess,
  onPaste,
  onPasteAndProcess,
}: CommitmentInputCardProps) {
  return (
    <section className="ea-card">
      <div className="ea-card__head">
        <div className="ea-card__title">Ingresar compromiso</div>
        <div className="ea-card__hint">Pega o escribe texto con fecha/hora.</div>
      </div>
      <label className="ea-field">
        <span className="ea-label">Texto</span>
        <textarea
          className="ea-textarea"
          value={inputText}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder={`Ej:\nmañana 19:00 dentista\nlunes 10:30 reunión`}
          rows={4}
          disabled={loading}
        />
      </label>
      <div className="ea-row">
        <button className="ea-btn ea-btn--primary" onClick={onProcess} type="button" disabled={loading}>
          Procesar
        </button>
        <button className="ea-btn ea-btn--ghost" onClick={onPaste} type="button" disabled={loading}>
          Pegar
        </button>
        <button className="ea-btn ea-btn--primary" onClick={onPasteAndProcess} type="button" disabled={loading}>
          📋 Pegar y Procesar
        </button>
      </div>
    </section>
  );
}

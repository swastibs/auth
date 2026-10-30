import "./CursorGrid.css";

const CursorGrid = ({
  cellSize = 70,
  color = "var(--accent-atomic)",
  className = "",
  gridOpacity = 0.15,
}) => {
  return (
    <div
      className={`cursor-grid${className ? ` ${className}` : ""}`}
      aria-hidden="true"
      style={{
        "--cursor-grid-cell-size": `${cellSize}px`,
        "--cursor-grid-color": color,
        "--cursor-grid-opacity": gridOpacity,
      }}
    />
  );
};

export default CursorGrid;
